package com.example.agenriod.notes

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import com.example.agentos.AgentPluginCapabilities
import com.example.agentos.AgentPluginDescriptor
import com.example.agentos.AgentPluginHostInfo
import com.example.agentos.AgentPluginInvokeError
import com.example.agentos.AgentPluginInvokeRequest
import com.example.agentos.AgentPluginInvokeResult
import com.example.agentos.AgentPluginResourceRequest
import com.example.agentos.IAgentPluginEndpoint
import com.example.agentos.IAgentPluginHostCallback
import com.example.agentos.IAgentPluginResultSink
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.Future

/** System-discovered Plugin endpoint. The Notes process owns its data and tools. */
class NotesPluginService : Service() {
    override fun onBind(intent: Intent?): IBinder = (application as NotesApplication).endpoint
}

class NotesPluginEndpoint(context: Context, private val mcp: JSONObject) : IAgentPluginEndpoint.Stub() {
    private data class Session(val tools: Set<String>, val resources: Set<String>)

    private val repository = NotesRepository(context)
    private val sessions = ConcurrentHashMap<String, Session>()
    private val calls = ConcurrentHashMap<String, Future<*>>()
    private val workers = Executors.newCachedThreadPool()

    override fun openPluginSession(pluginSessionId: String, userId: Int, hostVersion: String): AgentPluginDescriptor {
        sessions[pluginSessionId] = Session(TOOLS, emptySet())
        return descriptor(protocolVersion = 1)
    }

    override fun openPluginSessionV2(
        pluginSessionId: String,
        hostInfo: AgentPluginHostInfo,
        hostCallback: IAgentPluginHostCallback,
    ): AgentPluginDescriptor {
        sessions[pluginSessionId] = Session(emptySet(), emptySet())
        return descriptor(protocolVersion = 3)
    }

    override fun sessionGranted(pluginSessionId: String, granted: AgentPluginCapabilities) {
        sessions[pluginSessionId] = Session(
            granted.grantedTools?.toSet() ?: emptySet(),
            granted.grantedResources?.toSet() ?: emptySet(),
        )
    }

    override fun sessionGrantedSync(pluginSessionId: String, granted: AgentPluginCapabilities) {
        sessionGranted(pluginSessionId, granted)
    }

    override fun invokeSync(request: AgentPluginInvokeRequest): AgentPluginInvokeResult {
        val session = sessions[request.pluginSessionId]
            ?: return error(request.requestId, "unavailable", "Plugin session is not registered", true)
        if (request.tool !in session.tools)
            return error(request.requestId, "capability_denied", "Tool is not granted", false)
        if (request.deadlineEpochMs <= System.currentTimeMillis())
            return error(request.requestId, "timeout", "Tool deadline has elapsed", true)
        return runCatching { execute(request) }.fold(
            onSuccess = { ok(request.requestId, it.toString()) },
            onFailure = { error(request.requestId, "tool_failed", it.message ?: "Notes tool failed", false) },
        )
    }

    override fun invokeSyncJson(request: AgentPluginInvokeRequest): String {
        val reply = invokeSync(request)
        return JSONObject()
            .put("status", reply.status)
            .put("resultJson", reply.resultJson)
            .put("errorCode", reply.error.code)
            .toString()
    }

    override fun beginInvoke(request: AgentPluginInvokeRequest, sink: IAgentPluginResultSink) {
        val session = sessions[request.pluginSessionId]
        val callId = "${request.pluginSessionId}\n${request.requestId}"
        if (session == null) {
            sink.onResult(error(request.requestId, "unavailable", "Plugin session is not registered", true))
            return
        }
        if (request.tool !in session.tools) {
            sink.onResult(error(request.requestId, "capability_denied", "Tool is not granted", false))
            return
        }
        if (request.deadlineEpochMs <= System.currentTimeMillis()) {
            sink.onResult(error(request.requestId, "timeout", "Tool deadline has elapsed", true))
            return
        }
        calls[callId] = workers.submit {
            val result = runCatching { execute(request) }
            sink.onResult(result.fold(
                onSuccess = { ok(request.requestId, it.toString()) },
                onFailure = { error(request.requestId, "tool_failed", it.message ?: "Notes tool failed", false) },
            ))
            calls.remove(callId)
        }
    }

    private fun execute(request: AgentPluginInvokeRequest): JSONObject {
        val args = JSONObject(request.argsJson)
        return when (request.tool) {
            "notes.search" -> JSONObject().put("notes", repository.search(args.optString("query")))
            "notes.update" -> JSONObject().put("ok", true).put(
                "notes", repository.update(args.optString("id"), args.optString("title"), args.optString("body")))
            else -> error("Unknown notes tool: ${request.tool}")
        }
    }

    override fun beginReadResource(request: AgentPluginResourceRequest, sink: IAgentPluginResultSink) {
        val session = sessions[request.pluginSessionId]
        if (session == null) {
            sink.onResult(error(request.requestId, "unavailable", "Plugin session is not registered", true))
        } else {
            sink.onResult(error(request.requestId, "unknown_resource", "Notes exposes no resources", false))
        }
    }

    override fun cancelInvoke(pluginSessionId: String, requestId: String) {
        calls.remove("$pluginSessionId\n$requestId")?.cancel(true)
    }

    override fun closePluginSession(pluginSessionId: String, reason: String) {
        sessions.remove(pluginSessionId)
        calls.keys.filter { it.startsWith("$pluginSessionId\n") }.forEach { calls.remove(it)?.cancel(true) }
    }

    private fun descriptor(protocolVersion: Int) = AgentPluginDescriptor().apply {
        this.protocolVersion = protocolVersion
        pluginId = PLUGIN_ID
        packageName = "com.example.agenriod.notes"
        displayName = "Notes"
        descriptorJson = pluginDescriptor()
    }

    private fun ok(requestId: String, resultJson: String) = AgentPluginInvokeResult().apply {
        this.requestId = requestId
        status = "ok"
        this.resultJson = resultJson
        generatedAtMs = System.currentTimeMillis()
    }

    private fun error(requestId: String, code: String, message: String, retryable: Boolean) = AgentPluginInvokeResult().apply {
        this.requestId = requestId
        status = "error"
        this.error = AgentPluginInvokeError().apply {
            this.code = code
            this.message = message
            this.retryable = retryable
            dataJson = "{}"
        }
        generatedAtMs = System.currentTimeMillis()
    }

    private fun pluginDescriptor() = JSONObject()
        .put("protocolVersion", 3)
        .put("id", PLUGIN_ID)
        .put("name", "Notes")
        .put("description", "Search and update private notes")
        .put("tools", JSONArray().apply {
            put(JSONObject().put("name", "notes.search").put("description", "Search notes")
                .put("parameters", JSONObject().put("type", "object").put("properties", JSONObject().put("query", JSONObject().put("type", "string")))))
            put(JSONObject().put("name", "notes.update").put("description", "Create or update a note")
                .put("parameters", JSONObject().put("type", "object").put("properties", JSONObject()
                    .put("id", JSONObject().put("type", "string"))
                    .put("title", JSONObject().put("type", "string"))
                    .put("body", JSONObject().put("type", "string")))
                    .put("required", JSONArray().put("title").put("body"))))
        })
        .put("mcpServers", JSONArray().put(mcp))
        .toString()

    companion object {
        const val PLUGIN_ID = "com.example.agenriod.notes"
        private val TOOLS = setOf("notes.search", "notes.update")
    }
}
