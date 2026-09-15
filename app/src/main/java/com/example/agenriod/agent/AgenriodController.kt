package com.example.agenriod.agent

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.Base64
import java.util.UUID

class AgenriodController(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val store = AgentStore(context)
    private val sessionStore = SessionStore(context)
    private val skillCatalog = SkillCatalog(context)
    private var skills = skillCatalog.load()
    private var document = sessionStore.list().firstOrNull()?.let { sessionStore.read(it.id) } ?: sessionStore.create().also(sessionStore::save)
    private var rawMessages = document.rawMessages.toMutableList()
    private var pendingUserDisplay: String? = null
    private val _state = MutableStateFlow(
        AgentUiState(
            messages = document.uiMessages,
            config = store.loadConfig(),
            hooks = store.loadHooks(),
            pluginCount = 0,
            currentSession = document.summary,
            sessions = sessionStore.list(),
            skills = skills,
        )
    )
    val state: StateFlow<AgentUiState> = _state.asStateFlow()
    private val bridge = NativeAgentBridge(context, { _state.value.config }, { _state.value.hooks }, ::onRuntimeEvent)
    private val runtime = PiRuntime(context, bridge)

    init { reload() }

    fun reload() {
        scope.launch {
            setStatus("Starting pi-agent-core…", running = false)
            val plugins = bridge.listPlugins().mapNotNull(::pluginSummary)
            skills = skillCatalog.load()
            _state.value = _state.value.copy(plugins = plugins, pluginCount = plugins.size, skills = skills)
            val result = runtime.start(_state.value.config, rawMessages, document.summary.id)
            if (result.isSuccess) setStatus("Ready", running = false)
            else setStatus(result.exceptionOrNull()?.message ?: "Runtime failed to start", running = false)
        }
    }

    fun setDraft(value: String) { updateDraft(TextFieldValue(value, TextRange(value.length))) }
    fun updateDraft(value: TextFieldValue) { _state.value = _state.value.copy(draftValue = value) }

    fun send(images: List<ImageAttachment> = emptyList()) {
        val prompt = _state.value.draft.trim()
        if (prompt.isEmpty() || _state.value.isRunning || _state.value.draftValue.composition != null) return
        val executionPrompt = expandShortcut(prompt)
        pendingUserDisplay = prompt
        val title = if (document.summary.title == "New session") prompt.replace("\n", " ").take(48) else document.summary.title
        document = document.copy(summary = document.summary.copy(title = title, updatedAt = System.currentTimeMillis()))
        _state.value = _state.value.copy(draftValue = TextFieldValue(), isRunning = true, status = "Thinking…", currentSession = document.summary)
        scope.launch {
            val result = runtime.prompt(executionPrompt, images)
            if (result.isFailure) setStatus(result.exceptionOrNull()?.message ?: "Agent failed", running = false)
        }
    }

    fun abort() { runtime.abort(); setStatus("Stopped", running = false) }

    fun toggleSettings() { _state.value = _state.value.copy(showSettings = !_state.value.showSettings, showSessions = false, settingsPage = "model") }
    fun openModelSettings() { _state.value = _state.value.copy(showSettings = true, showSessions = false, settingsPage = "model") }
    fun openPluginManager() { _state.value = _state.value.copy(showSettings = true, showSessions = false, settingsPage = "plugins") }
    fun openHooks() { _state.value = _state.value.copy(showSettings = true, showSessions = false, settingsPage = "hooks") }
    fun toggleSessions() { _state.value = _state.value.copy(showSessions = !_state.value.showSessions, showSettings = false) }
    fun updateConfig(config: ModelConfig) { _state.value = _state.value.copy(config = config) }
    fun updateHooks(hooks: String) { _state.value = _state.value.copy(hooks = hooks) }

    fun saveSettings(pluginManifest: String) {
        val saved = pluginManifest.trim().takeIf { it.isNotEmpty() }?.let { bridge.installPluginManifest(it) }
        if (saved?.isFailure == true) {
            setStatus("Plugin error: ${saved.exceptionOrNull()?.message ?: "invalid manifest"}", running = false)
            return
        }
        store.save(_state.value.config, _state.value.hooks)
        _state.value = _state.value.copy(showSettings = false, status = if (saved?.getOrNull() != null) "Plugin installed" else "Settings saved")
        reload()
    }

    fun deletePlugin(id: String) {
        bridge.deletePlugin(id)
        refreshPlugins()
    }

    fun refreshPlugins() {
        val plugins = bridge.listPlugins().mapNotNull(::pluginSummary)
        _state.value = _state.value.copy(plugins = plugins, pluginCount = plugins.size)
        if (!_state.value.isRunning) reload()
    }

    fun newSession() {
        scope.launch { switchTo(sessionStore.create()) }
    }

    fun switchSession(id: String) {
        if (id == document.summary.id) { toggleSessions(); return }
        val target = runCatching { sessionStore.read(id) }.getOrNull() ?: return
        scope.launch { switchTo(target) }
    }

    fun renameSession(id: String, title: String) {
        val safeTitle = title.trim().ifBlank { "New session" }.take(80)
        val existing = if (id == document.summary.id) document.copy(rawMessages = rawMessages.toList(), uiMessages = _state.value.messages) else sessionStore.read(id)
        val renamed = existing.copy(summary = existing.summary.copy(title = safeTitle))
        sessionStore.save(renamed)
        if (id == document.summary.id) document = renamed
        _state.value = _state.value.copy(currentSession = document.summary, sessions = sessionStore.list())
    }

    fun deleteSession(id: String) {
        if (id == document.summary.id) {
            scope.launch {
                switchTo(sessionStore.create())
                sessionStore.delete(id)
                _state.value = _state.value.copy(sessions = sessionStore.list())
            }
        } else {
            sessionStore.delete(id)
            _state.value = _state.value.copy(sessions = sessionStore.list())
        }
    }

    suspend fun readImage(uri: Uri): ImageAttachment? = withContext(Dispatchers.IO) {
        runCatching {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@runCatching null
            ImageAttachment(Base64.getEncoder().encodeToString(bytes), context.contentResolver.getType(uri) ?: "image/jpeg")
        }.getOrNull()
    }

    fun close() { scope.launch { runtime.abort(); runtime.close(); persist() } }

    private suspend fun switchTo(target: SessionDocument) {
        runtime.abort()
        persist()
        runtime.close()
        document = target.copy(summary = target.summary.copy(updatedAt = System.currentTimeMillis()))
        sessionStore.save(document)
        rawMessages = document.rawMessages.toMutableList()
        val plugins = bridge.listPlugins().mapNotNull(::pluginSummary)
        _state.value = _state.value.copy(messages = document.uiMessages, draftValue = TextFieldValue(), currentSession = document.summary, sessions = sessionStore.list(), showSessions = false, isRunning = false, status = "Loading session…", plugins = plugins, pluginCount = plugins.size)
        val result = runtime.start(_state.value.config, rawMessages, document.summary.id)
        setStatus(if (result.isSuccess) "Ready" else "Session failed to load", running = false)
    }

    private fun expandShortcut(prompt: String): String {
        val instructions = mutableListOf<String>()
        var request = prompt
        val command = Regex("(?:^|\\s)/([A-Za-z0-9_-]+)(?=\\s|$)").find(prompt)
        val skill = command?.groupValues?.get(1)?.let { name -> skills.firstOrNull { it.name.equals(name, true) } }
        if (command != null && skill != null) { instructions += skill.instruction; request = request.removeRange(command.range).trim() }
        val mention = request.split(Regex("\\s+")).firstOrNull { it.startsWith("@") }
        val plugin = mention?.removePrefix("@")?.let { name -> _state.value.plugins.firstOrNull { it.name.equals(name, true) || it.id == name } }
        if (plugin != null && mention != null) { instructions += "Use the ${plugin.name} plugin tools when useful."; request = request.replace(mention, "").trim() }
        return if (instructions.isEmpty()) prompt else instructions.joinToString("\n\n") + "\n\nUser request: $request"
    }

    private fun pluginSummary(json: JSONObject): PluginSummary? {
        val id = json.optString("id").ifBlank { return null }
        return PluginSummary(id, json.optString("name", id), json.optString("description"), json.optJSONArray("tools")?.length() ?: 0)
    }

    private fun setStatus(status: String, running: Boolean) { _state.value = _state.value.copy(status = status, isRunning = running) }

    private fun persist() {
        document = document.copy(summary = document.summary.copy(updatedAt = System.currentTimeMillis()), rawMessages = rawMessages.toList(), uiMessages = _state.value.messages)
        sessionStore.save(document)
        _state.value = _state.value.copy(currentSession = document.summary, sessions = sessionStore.list())
    }

    private fun onRuntimeEvent(raw: String) {
        scope.launch { reduceRuntimeEvent(raw) }
    }

    private fun reduceRuntimeEvent(raw: String) {
        val event = runCatching { JSONObject(raw) }.getOrNull() ?: return
        if (event.optString("sessionId", document.summary.id) != document.summary.id) return
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
                if (role == "user") persist()
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
                setStatus("Error: ${error.take(120)}", running = false)
            }
            "agent_end" -> { persist(); if (!_state.value.status.startsWith("Error:")) setStatus("Ready", running = false) }
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
