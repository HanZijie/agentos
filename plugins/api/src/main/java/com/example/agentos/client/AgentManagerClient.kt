package com.example.agentos.client

import android.os.IBinder
import com.example.agentos.AgentEnqueueResult
import com.example.agentos.AgentSessionSnapshot
import com.example.agentos.IAgentEventCallback
import com.example.agentos.IAgentManager
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import java.io.Closeable
import java.util.UUID

/**
 * Small client used by every AgentOS frontend. The system app is reached via
 * the service manager; no frontend starts or owns an Agent runtime process.
 */
class AgentManagerClient(
    private val frontendId: String,
) : Closeable {
    private val _events = MutableSharedFlow<AgentEvent>(extraBufferCapacity = 128)
    val events: SharedFlow<AgentEvent> = _events

    @Volatile
    private var manager: IAgentManager? = null
    @Volatile
    var sessionId: String? = null
        private set

    private val callback = object : IAgentEventCallback.Stub() {
        override fun onEvent(sessionId: String, sequence: Long, eventJson: String) {
            _events.tryEmit(AgentEvent(sessionId, sequence, eventJson))
        }
    }

    /** Connects to AgentManagerService and creates a per-user session. */
    fun connect(metadataJson: String = "{}"): Result<String> = runCatching {
        val binder = serviceManagerBinder() ?: error("AgentManagerService is unavailable")
        val service = IAgentManager.Stub.asInterface(binder)
            ?: error("AgentManagerService returned a null Binder")
        manager = service
        val id = service.createSession(frontendId, metadataJson)
        sessionId = id
        service.subscribeOutput(id, 0L, callback)
        id
    }

    fun submit(contentJson: String, requestId: String = UUID.randomUUID().toString()): Result<AgentEnqueueResult> = runCatching {
        val service = manager ?: error("AgentManagerService is unavailable")
        val id = sessionId ?: error("Agent session is not connected")
        service.submitInput(id, requestId, contentJson)
    }

    fun snapshot(): Result<AgentSessionSnapshot> = runCatching {
        val service = manager ?: error("AgentManagerService is unavailable")
        val id = sessionId ?: error("Agent session is not connected")
        service.getSnapshot(id)
    }

    fun cancel(requestId: String) {
        val service = manager ?: return
        val id = sessionId ?: return
        runCatching { service.cancelTask(id, requestId) }
    }

    override fun close() {
        val service = manager
        val id = sessionId
        if (service != null && id != null) runCatching { service.unsubscribeOutput(id, callback) }
        manager = null
        sessionId = null
    }

    private fun serviceManagerBinder(): IBinder? = runCatching {
        val serviceManager = Class.forName("android.os.ServiceManager")
        serviceManager.getDeclaredMethod("getService", String::class.java)
            .invoke(null, SERVICE_NAME) as? IBinder
    }.getOrNull()

    companion object {
        private const val SERVICE_NAME = "agentos"
    }
}

data class AgentEvent(
    val sessionId: String,
    val sequence: Long,
    val json: String,
)
