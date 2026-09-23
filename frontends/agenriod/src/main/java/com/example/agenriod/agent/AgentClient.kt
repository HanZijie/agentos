package com.example.agenriod.agent

import android.content.Context
import android.net.Uri
import android.os.IBinder
import android.os.ParcelFileDescriptor
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import com.example.agenriod.filebroker.AndroidFileBroker
import com.example.agenriod.filebroker.FileRef
import com.example.agentos.client.AgentEvent
import com.example.agentos.client.AgentManagerClient
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.Base64
import java.util.UUID

/** Client owns presentation state; Host commands and snapshots cross Binder. */
class AgentClient(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val _state = MutableStateFlow(AgentUiState(status = "Connecting to AgentManagerService…"))
    val state: StateFlow<AgentUiState> = _state.asStateFlow()
    @Volatile private var remote: IAgentService? = null
    private val systemClient = AgentManagerClient("com.example.agenriod")
    @Volatile private var systemMode = false
    private var systemSessionRequest: String? = null
    private var revision = -1L
    private val commands = Channel<suspend () -> Unit>(Channel.UNLIMITED)
    init {
        scope.launch { for (command in commands) command() }
        scope.launch {
            systemClient.events.collect { reduceSystemEvent(it) }
        }
        connectSystem()
    }
    private val callback = object : IAgentServiceCallback.Stub() {
        override fun onStateChanged(sequence: Long, snapshot: ParcelFileDescriptor) {
            scope.launch {
                val incoming = runCatching { withContext(Dispatchers.IO) { stateFromJson(JsonParcel.read(snapshot)) } }.getOrElse { snapshot.close(); return@launch }
                if (sequence <= revision) return@launch
                revision = sequence
                val old = _state.value
                _state.value = old.copy(messages = incoming.messages, config = incoming.config, hooks = incoming.hooks, pluginCount = incoming.pluginCount,
                    isRunning = incoming.isRunning, status = incoming.status, currentSession = incoming.currentSession, sessions = incoming.sessions,
                    plugins = incoming.plugins, skills = incoming.skills, tasks = incoming.tasks)
            }
        }
    }
    fun attach(binder: IBinder) {
        systemMode = false
        revision = -1L
        remote = IAgentService.Stub.asInterface(binder)
        scope.launch(Dispatchers.IO) { runCatching { remote?.registerCallback(callback) } }
    }
    fun detach() { remote = null; _state.value = _state.value.copy(isRunning = false, status = "Legacy Agent Service disconnected") }
    private fun command(name: String, payload: JSONObject = JSONObject(), success: () -> Unit = {}) {
        commands.trySend {
            runCatching {
                withContext(Dispatchers.IO) {
                    val service = remote ?: error("Agent Service is not connected")
                    val reply = JsonParcel.write(context, payload.toString()).use { service.command(name, it) }
                    val result = JSONObject(reply)
                    check(result.optBoolean("ok")) { result.optString("error", "Command failed") }
                }
            }.onSuccess { success() }.onFailure { _state.value = _state.value.copy(status = it.message ?: "Agent command failed") }
        }
    }
    fun setDraft(value: String) = updateDraft(TextFieldValue(value, TextRange(value.length)))
    fun updateDraft(value: TextFieldValue) { _state.value = _state.value.copy(draftValue = value) }
    fun send(images: List<ImageAttachment> = emptyList()) {
        val editor = _state.value.draftValue
        if (editor.composition != null || editor.text.isBlank()) return
        val requestId = UUID.randomUUID().toString()
        val content = JSONObject().put("content", JSONArray().apply {
            put(JSONObject().put("type", "text").put("text", editor.text))
            images.forEach { put(JSONObject().put("type", "image").put("base64", it.base64).put("mimeType", it.mimeType)) }
        }).toString()
        if (systemMode) {
            scope.launch(Dispatchers.IO) {
                systemClient.submit(content, requestId).onFailure { error ->
                    _state.value = _state.value.copy(status = error.message ?: "Agent input failed")
                }.onSuccess {
                    systemSessionRequest = requestId
                    if (_state.value.draft == editor.text) updateDraft(TextFieldValue())
                }
            }
        } else {
            command("send", JSONObject().put("id", requestId).put("text", editor.text).put("images", JSONArray().apply { images.forEach { put(JSONObject().put("base64", it.base64).put("mimeType", it.mimeType)) } })) {
                if (_state.value.draft == editor.text) updateDraft(TextFieldValue())
            }
        }
    }
    fun abort() {
        if (systemMode) systemSessionRequest?.let(systemClient::cancel)
        else command("abort")
    }
    fun reload() {
        if (systemMode) {
            scope.launch(Dispatchers.IO) { systemClient.snapshot() }
        } else command("reload")
    }
    fun toggleSettings() { _state.value = _state.value.copy(showSettings = !_state.value.showSettings, showSessions = false, settingsPage = "model") }
    private fun page(value: String) { _state.value = _state.value.copy(showSettings = true, showSessions = false, settingsPage = value) }
    fun openModelSettings() = page("model")
    fun openPluginManager() = page("plugins")
    fun openHooks() = page("hooks")
    fun toggleSessions() { _state.value = _state.value.copy(showSessions = !_state.value.showSessions, showSettings = false) }
    fun updateConfig(config: ModelConfig) { _state.value = _state.value.copy(config = config) }
    fun updateHooks(hooks: String) { _state.value = _state.value.copy(hooks = hooks) }
    fun saveSettings(pluginManifest: String) = command("saveSettings", JSONObject().put("config", _state.value.config.toJson()).put("hooks", _state.value.hooks).put("manifest", pluginManifest)) { _state.value = _state.value.copy(showSettings = false) }
    fun deletePlugin(id: String) = command("deletePlugin", JSONObject().put("id", id))
    fun refreshPlugins() = command("refreshPlugins")
    fun newSession() {
        if (systemMode) {
            scope.launch(Dispatchers.IO) {
                systemClient.close()
                connectSystem()
            }
            _state.value = _state.value.copy(showSessions = false, draftValue = TextFieldValue())
        } else command("newSession") { _state.value = _state.value.copy(showSessions = false, draftValue = TextFieldValue()) }
    }
    fun switchSession(id: String) = command("switchSession", JSONObject().put("id", id)) { _state.value = _state.value.copy(showSessions = false, draftValue = TextFieldValue()) }
    fun renameSession(id: String, title: String) = command("renameSession", JSONObject().put("id", id).put("title", title))
    fun deleteSession(id: String) = command("deleteSession", JSONObject().put("id", id))
    fun cancelTask(id: String) {
        if (systemMode) systemClient.cancel(id) else command("cancelTask", JSONObject().put("id", id))
    }
    fun retryTask(id: String) = command("retryTask", JSONObject().put("id", id))
    suspend fun readImage(uri: Uri): ImageAttachment? = runCatching {
        val image = AndroidFileBroker(context).read(FileRef(uri), 8L * 1024 * 1024)
        ImageAttachment(Base64.getEncoder().encodeToString(image.bytes), image.mimeType ?: "image/jpeg")
    }.getOrNull()
    fun close() {
        val service = remote
        remote = null
        scope.launch {
            withContext(Dispatchers.IO) { runCatching { service?.unregisterCallback(callback); systemClient.close() } }
            commands.close()
            scope.cancel()
        }
    }

    private fun connectSystem() {
        scope.launch(Dispatchers.IO) {
            systemClient.connect("{\"title\":\"Agenriod\"}").onSuccess { id ->
                systemMode = true
                _state.value = _state.value.copy(
                    status = "Ready",
                    isRunning = false,
                    currentSession = SessionSummary(id, "System Agent", System.currentTimeMillis()),
                )
            }.onFailure { error ->
                if (remote == null) _state.value = _state.value.copy(status = error.message ?: "AgentManagerService unavailable")
            }
        }
    }

    private fun reduceSystemEvent(event: AgentEvent) {
        val json = runCatching { JSONObject(event.json) }.getOrNull() ?: return
        when (json.optString("eventType")) {
            "task.queued" -> _state.value = _state.value.copy(status = "Queued", isRunning = true)
            "task.cancelled" -> _state.value = _state.value.copy(status = "Stopped", isRunning = false)
            "task.failed" -> {
                val error = json.optJSONObject("error")?.optString("message").orEmpty()
                val taskId = json.optString("taskId").ifBlank { event.sequence.toString() }
                _state.value = _state.value.copy(
                    messages = _state.value.messages + ChatMessage(taskId, "assistant", error.ifBlank { "Agent task failed" }, isError = true),
                    status = "Error: ${error.ifBlank { "Agent task failed" }}",
                    isRunning = false,
                )
            }
        }
    }
}
