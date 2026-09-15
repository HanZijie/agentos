package com.example.agenriod.agent

import android.content.Context
import android.net.Uri
import android.os.IBinder
import android.os.ParcelFileDescriptor
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import com.example.agenriod.filebroker.AndroidFileBroker
import com.example.agenriod.filebroker.FileRef
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
    private val _state = MutableStateFlow(AgentUiState(status = "Connecting to Agent Service…"))
    val state: StateFlow<AgentUiState> = _state.asStateFlow()
    @Volatile private var remote: IAgentService? = null
    private var revision = -1L
    private val commands = Channel<suspend () -> Unit>(Channel.UNLIMITED)
    init { scope.launch { for (command in commands) command() } }
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
        revision = -1L
        remote = IAgentService.Stub.asInterface(binder)
        scope.launch(Dispatchers.IO) { runCatching { remote?.registerCallback(callback) } }
    }
    fun detach() { remote = null; _state.value = _state.value.copy(isRunning = false, status = "Agent Service disconnected; reconnecting…") }
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
        command("send", JSONObject().put("id", UUID.randomUUID().toString()).put("text", editor.text).put("images", JSONArray().apply { images.forEach { put(JSONObject().put("base64", it.base64).put("mimeType", it.mimeType)) } })) {
            if (_state.value.draft == editor.text) updateDraft(TextFieldValue())
        }
    }
    fun abort() = command("abort")
    fun reload() = command("reload")
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
    fun newSession() = command("newSession") { _state.value = _state.value.copy(showSessions = false, draftValue = TextFieldValue()) }
    fun switchSession(id: String) = command("switchSession", JSONObject().put("id", id)) { _state.value = _state.value.copy(showSessions = false, draftValue = TextFieldValue()) }
    fun renameSession(id: String, title: String) = command("renameSession", JSONObject().put("id", id).put("title", title))
    fun deleteSession(id: String) = command("deleteSession", JSONObject().put("id", id))
    fun cancelTask(id: String) = command("cancelTask", JSONObject().put("id", id))
    fun retryTask(id: String) = command("retryTask", JSONObject().put("id", id))
    suspend fun readImage(uri: Uri): ImageAttachment? = runCatching {
        val image = AndroidFileBroker(context).read(FileRef(uri), 8L * 1024 * 1024)
        ImageAttachment(Base64.getEncoder().encodeToString(image.bytes), image.mimeType ?: "image/jpeg")
    }.getOrNull()
    fun close() {
        val service = remote
        remote = null
        scope.launch { withContext(Dispatchers.IO) { runCatching { service?.unregisterCallback(callback) } }; commands.close(); scope.cancel() }
    }
}
