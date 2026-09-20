package com.example.agenriod.agent

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.io.File
import java.util.UUID

/** Service-owned module: session history, task scheduling, Pi and event reduction. */
class AgentHost(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val lifecycle = Mutex()
    private val store = AgentStore(context)
    private val sessionStore = SessionStore(context)
    private val skillCatalog = SkillCatalog(context)
    private var skills = skillCatalog.load()
    private var document = sessionStore.list().firstOrNull()?.let { sessionStore.read(it.id) } ?: sessionStore.create().also(sessionStore::save)
    private var rawMessages = document.rawMessages.toMutableList()
    private var pendingUserDisplay: String? = null
    private var runId = UUID.randomUUID().toString()
    private var runtimeError: String? = null
    private val _state = MutableStateFlow(AgentHostState(messages = document.uiMessages, config = store.loadConfig(), hooks = store.loadHooks(), currentSession = document.summary, sessions = sessionStore.list(), skills = skills))
    val state: StateFlow<AgentHostState> = _state.asStateFlow()
    private val bridge = NativeAgentBridge(context, { _state.value.config }, { _state.value.hooks }, ::onRuntimeEvent)
    private val runtime = PiRuntime(context, bridge)
    private val taskQueue = AgentTaskQueue(File(context.filesDir, "agent-tasks.json"), scope, ::executeTask) { tasks ->
        val active = tasks.any { it.status == "running" }
        val status = when {
            active -> _state.value.status
            tasks.any { it.status == "queued" } -> "Queued"
            tasks.any { it.status == "interrupted" } -> "Task interrupted · retry in Sessions"
            tasks.lastOrNull()?.status == "failed" -> "Error: ${tasks.last().error.take(120)}"
            else -> "Ready"
        }
        _state.value = _state.value.copy(tasks = tasks, isRunning = active, status = status)
    }
    init {
        reload()
        scope.launch { bridge.pluginChanges.collect { refreshCatalog() } }
    }

    fun submit(prompt: String, images: List<ImageAttachment> = emptyList(), requestId: String = UUID.randomUUID().toString()): String {
        require(prompt.isNotBlank()) { "Prompt is empty" }
        val title = if (document.summary.title == "New session") prompt.replace("\n", " ").take(48) else document.summary.title
        document = document.copy(summary = document.summary.copy(title = title))
        persist()
        taskQueue.enqueue(AgentTask(id = requestId, sessionId = document.summary.id, prompt = expandShortcut(prompt), displayPrompt = prompt, images = images))
        return requestId
    }
    fun abort() { taskQueue.activeId()?.let(taskQueue::cancel); runtime.abort(); setStatus("Stopped", false) }
    fun cancelTask(id: String) { if (taskQueue.activeId() == id) runtime.abort(); taskQueue.cancel(id) }
    fun retryTask(id: String) { taskQueue.retry(id) }
    fun reload() {
        if (_state.value.isRunning) return
        scope.launch { lifecycle.withLock {
            refreshCatalog()
            runtime.close()
            runtime.start(_state.value.config, rawMessages, document.summary.id, runId).onFailure { setStatus(it.message ?: "Runtime failed", false) }
        } }
    }
    private suspend fun executeTask(task: AgentTask): Result<Unit> = lifecycle.withLock {
        if (document.summary.id != task.sessionId) {
            persist()
            loadSession(sessionStore.read(task.sessionId))
        }
        runtime.close()
        runId = UUID.randomUUID().toString()
        runtimeError = null
        pendingUserDisplay = task.displayPrompt
        refreshCatalog()
        setStatus("Thinking…", true)
        rawMessages = completeHistory(rawMessages).toMutableList()
        val started = runtime.start(_state.value.config, rawMessages, document.summary.id, runId)
        if (started.isFailure) return@withLock started
        val result = runtime.prompt(task.prompt, task.images)
        yield() // Runtime callbacks were enqueued before prompt completion.
        persist()
        runtimeError?.let { Result.failure(IllegalStateException(it)) } ?: result
    }
    fun saveSettings(config: ModelConfig, hooks: String, pluginManifest: String) {
        check(!_state.value.isRunning) { "Stop the current task before saving settings" }
        if (pluginManifest.isNotBlank()) bridge.installPluginManifest(pluginManifest).getOrThrow()
        store.save(config, hooks)
        _state.value = _state.value.copy(config = config, hooks = hooks)
        reload()
    }
    fun deletePlugin(id: String) { if (!_state.value.isRunning) { bridge.deletePlugin(id); reload() } }
    fun refreshPlugins() { bridge.refreshExternalPlugins(); reload() }
    private suspend fun refreshCatalog() {
        skills = skillCatalog.load()
        val plugins = withContext(Dispatchers.IO) { bridge.pluginCatalog() }.mapNotNull { json ->
            val id = json.optString("id").ifBlank { return@mapNotNull null }
            PluginSummary(id, json.optString("name", id), json.optString("description"), json.optJSONArray("tools")?.length() ?: 0, json.optBoolean("active", true), json.optString("status"), json.optString("packageName"))
        }
        _state.value = _state.value.copy(plugins = plugins, pluginCount = plugins.count { it.active }, skills = skills)
    }
    suspend fun newSession() { switchTo(sessionStore.create()) }
    suspend fun switchSession(id: String) { if (id == document.summary.id) return; switchTo(sessionStore.read(id)) }
    private suspend fun switchTo(target: SessionDocument) {
        abort()
        lifecycle.withLock { persist(); runtime.close(); runId = UUID.randomUUID().toString(); loadSession(target); refreshCatalog() }
    }
    private fun loadSession(target: SessionDocument) {
        document = target
        rawMessages = document.rawMessages.toMutableList()
        sessionStore.save(document)
        _state.value = _state.value.copy(messages = document.uiMessages, currentSession = document.summary, sessions = sessionStore.list())
    }
    fun renameSession(id: String, title: String) {
        val existing = if (id == document.summary.id) document.copy(rawMessages = rawMessages.toList(), uiMessages = _state.value.messages) else sessionStore.read(id)
        val renamed = existing.copy(summary = existing.summary.copy(title = title.trim().ifBlank { "New session" }.take(80)))
        sessionStore.save(renamed)
        if (id == document.summary.id) document = renamed
        _state.value = _state.value.copy(currentSession = document.summary, sessions = sessionStore.list())
    }
    suspend fun deleteSession(id: String) {
        if (id == document.summary.id) abort()
        taskQueue.cancelSession(id)
        lifecycle.withLock {
            if (id == document.summary.id) { runtime.close(); runId = UUID.randomUUID().toString(); loadSession(sessionStore.create()) }
            sessionStore.delete(id)
            _state.value = _state.value.copy(sessions = sessionStore.list())
        }
    }
    fun close() {
        taskQueue.close()
        runtime.abort()
        scope.launch { runtime.close(); persist(); scope.cancel() }
    }
    private fun setStatus(status: String, running: Boolean) { _state.value = _state.value.copy(status = status, isRunning = running) }
    private fun persist() {
        document = document.copy(summary = document.summary.copy(updatedAt = System.currentTimeMillis()), rawMessages = rawMessages.toList(), uiMessages = _state.value.messages)
        sessionStore.save(document)
        _state.value = _state.value.copy(currentSession = document.summary, sessions = sessionStore.list())
    }
    private fun onRuntimeEvent(raw: String) { scope.launch { reduceRuntimeEvent(raw) } }
    private fun expandShortcut(prompt: String): String {
        val instructions = mutableListOf<String>()
        var request = prompt
        val command = Regex("(?:^|\\s)/([A-Za-z0-9_-]+)(?=\\s|$)").find(prompt)
        val skill = command?.groupValues?.get(1)?.let { name -> skills.firstOrNull { it.name.equals(name, true) } }
        if (command != null && skill != null) { instructions += skill.instruction; request = request.removeRange(command.range).trim() }
        val mention = request.split(Regex("\\s+")).firstOrNull { it.startsWith("@") }
        val plugin = mention?.removePrefix("@")?.let { name -> _state.value.plugins.firstOrNull { it.active && (it.name.equals(name, true) || it.id == name) } }
        if (plugin != null) { instructions += "Use the ${plugin.name} plugin tools when useful."; request = request.replace(mention.orEmpty(), "").trim() }
        return if (instructions.isEmpty()) prompt else instructions.joinToString("\n\n") + "\n\nUser request: $request"
    }
    /** Drop an incomplete tool-call group before an explicit retry. Never replay it automatically. */
    private fun completeHistory(messages: List<String>): List<String> {
        for ((index, raw) in messages.withIndex()) {
            val message = JSONObject(raw)
            if (message.optString("role") != "assistant") continue
            val content = message.optJSONArray("content") ?: continue
            val calls = (0 until content.length()).mapNotNull { content.optJSONObject(it)?.takeIf { it.optString("type") == "toolCall" }?.optString("id") }
            val results = messages.drop(index + 1).map { JSONObject(it) }.takeWhile { it.optString("role") == "toolResult" }.map { it.optString("toolCallId") }
            if (!results.containsAll(calls)) return messages.take(index)
        }
        return messages
    }
    private fun reduceRuntimeEvent(raw: String) {
        val event = runCatching { JSONObject(raw) }.getOrNull() ?: return
        if (event.optString("sessionId") != document.summary.id || event.optString("runId") != runId) return
        when (event.optString("type")) {
            "message_start" -> {
                val message = event.optJSONObject("message") ?: return
                val role = message.optString("role")
                if (role == "user" || role == "assistant") {
                    val id = message.optString("id").ifBlank { UUID.randomUUID().toString() }
                    val text = if (role == "user") pendingUserDisplay ?: messageText(message) else messageText(message)
                    if (role == "user") pendingUserDisplay = null
                    if (_state.value.messages.none { it.id == id }) _state.value = _state.value.copy(messages = _state.value.messages + ChatMessage(id, role, text, isStreaming = role == "assistant"))
                }
            }
            "message_update" -> {
                val message = event.optJSONObject("message") ?: return
                if (message.optString("role") != "assistant") return
                val current = _state.value.messages
                val index = current.indexOfLast { it.role == "assistant" }
                if (index >= 0) _state.value = _state.value.copy(messages = current.toMutableList().also { it[index] = it[index].copy(text = messageText(message), isStreaming = true) })
            }
            "message_end" -> {
                val message = event.optJSONObject("message") ?: return
                rawMessages += message.toString()
                val role = message.optString("role")
                if (role == "assistant") {
                    val current = _state.value.messages
                    val index = current.indexOfLast { it.role == "assistant" }
                    val text = messageText(message)
                    if (index >= 0) _state.value = _state.value.copy(messages = current.toMutableList().also {
                        if (text.isBlank() && message.optString("stopReason") == "toolUse") it.removeAt(index)
                        else it[index] = it[index].copy(text = text, isStreaming = false, isError = message.optString("stopReason") == "error")
                    })
                }
                persist()
            }
            "tool_execution_start" -> {
                val name = event.optString("toolName")
                val args = event.optJSONObject("args")?.toString(2).orEmpty()
                val callId = event.optString("toolCallId").ifBlank { UUID.randomUUID().toString() }
                _state.value = _state.value.copy(messages = _state.value.messages + ChatMessage("tool-$callId", "tool", args, name, isStreaming = true), status = "Running $name…")
            }
            "tool_execution_end" -> {
                val name = event.optString("toolName")
                val current = _state.value.messages
                val index = current.indexOfLast { it.id == "tool-${event.optString("toolCallId")}" }
                val output = event.optJSONObject("result")?.let(::messageText).orEmpty()
                if (index >= 0) _state.value = _state.value.copy(messages = current.toMutableList().also {
                    it[index] = it[index].copy(text = "${it[index].text}\n\n${output.ifBlank { "(no output)" }}", isStreaming = false, isError = event.optBoolean("isError"))
                })
                persist()
            }
            "turn_end" -> event.optJSONObject("message")?.takeIf { it.optString("stopReason") == "error" }?.let { message ->
                val error = message.optString("errorMessage").ifBlank { "Model request failed" }
                Log.e("AgenriodAgent", error)
                runtimeError = error
                setStatus("Error: ${error.take(120)}", running = true)
            }
            "agent_end" -> persist()
        }
    }

    private fun messageText(message: JSONObject): String {
        val content = message.optJSONArray("content") ?: return message.optString("errorMessage")
        val text = (0 until content.length()).joinToString("") { index ->
            val block = content.optJSONObject(index) ?: return@joinToString ""
            when (block.optString("type")) {
                "text" -> block.optString("text")
                "thinking" -> "▸ ${block.optString("thinking")}\n"
                "toolCall" -> ""
                else -> ""
            }
        }
        return text.ifBlank { message.optString("errorMessage") }
    }
}
