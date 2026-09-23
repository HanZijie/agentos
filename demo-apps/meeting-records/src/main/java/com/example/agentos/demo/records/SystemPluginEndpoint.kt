package com.example.agentos.demo.records

import android.content.Context
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

/** AOSP Plugin endpoint used by AgentManagerService discovery and handshake. */
internal class SystemPluginEndpoint(
    context: Context,
    private val repository: RecordsRepository,
    private val mcp: JSONObject,
) : IAgentPluginEndpoint.Stub() {
    private val packageName = context.packageName
    private val sessions = ConcurrentHashMap<String, Set<String>>()

    override fun openPluginSession(pluginSessionId: String, userId: Int, hostVersion: String): AgentPluginDescriptor {
        sessions[pluginSessionId] = TOOLS
        return descriptor(1)
    }

    override fun openPluginSessionV2(
        pluginSessionId: String,
        hostInfo: AgentPluginHostInfo,
        hostCallback: IAgentPluginHostCallback,
    ): AgentPluginDescriptor {
        sessions[pluginSessionId] = emptySet()
        return descriptor(3)
    }

    override fun sessionGranted(pluginSessionId: String, granted: AgentPluginCapabilities) {
        sessions[pluginSessionId] = granted.grantedTools?.toSet() ?: emptySet()
    }

    override fun beginInvoke(request: AgentPluginInvokeRequest, sink: IAgentPluginResultSink) {
        val granted = sessions[request.pluginSessionId]
        if (granted == null) {
            sink.onResult(error(request.requestId, "unavailable", "Plugin session is not registered", true))
            return
        }
        if (request.tool !in granted) {
            sink.onResult(error(request.requestId, "capability_denied", "Tool is not granted", false))
            return
        }
        val result = runCatching {
            val args = JSONObject(request.argsJson)
            when (request.tool) {
                "records.create" -> {
                    val record = repository.create(required(args, "title"), required(args, "body"), args.optString("meetingTime"))
                    JSONObject().put("ok", true).put("record", record.toJson())
                }
                "records.list" -> JSONObject().put("records", JSONArray().apply {
                    repository.list(args.optString("query")).forEach { put(it.toJson()) }
                })
                "records.get" -> JSONObject().put("record", repository.get(required(args, "id"))?.toJson() ?: JSONObject.NULL)
                "records.update" -> {
                    val record = repository.update(required(args, "id"), required(args, "title"), required(args, "body"), args.optString("meetingTime"))
                    JSONObject().put("ok", true).put("record", record.toJson())
                }
                "records.delete" -> JSONObject().put("ok", repository.delete(required(args, "id")))
                else -> error("Unknown records tool: ${request.tool}")
            }
        }
        sink.onResult(result.fold(
            onSuccess = { ok(request.requestId, it.toString()) },
            onFailure = { error(request.requestId, "tool_failed", it.message ?: "Records tool failed", false) },
        ))
    }

    override fun beginReadResource(request: AgentPluginResourceRequest, sink: IAgentPluginResultSink) {
        sink.onResult(error(request.requestId, "unknown_resource", "Meeting Records exposes no resources", false))
    }

    override fun cancelInvoke(pluginSessionId: String, requestId: String) = Unit

    override fun closePluginSession(pluginSessionId: String, reason: String) {
        sessions.remove(pluginSessionId)
    }

    private fun descriptor(protocolVersion: Int) = AgentPluginDescriptor().apply {
        this.protocolVersion = protocolVersion
        pluginId = packageName
        packageName = this@SystemPluginEndpoint.packageName
        displayName = "Meeting Records"
        descriptorJson = descriptorJson().toString()
    }

    private fun descriptorJson() = JSONObject()
        .put("protocolVersion", 3)
        .put("pluginId", packageName)
        .put("displayName", "Meeting Records")
        .put("version", "0.1.0")
        .put("tools", JSONArray().apply {
            put(tool("records.create", "Create a meeting record", schema("title", "body", "meetingTime"), "external", 8000, JSONArray().put("title").put("body")))
            put(tool("records.list", "List meeting records", schema("query"), "none", 2000))
            put(tool("records.get", "Read one meeting record", schema("id"), "none", 2000, JSONArray().put("id")))
            put(tool("records.update", "Update one meeting record", schema("id", "title", "body", "meetingTime"), "external", 8000, JSONArray().put("id").put("title").put("body")))
            put(tool("records.delete", "Delete one meeting record", schema("id"), "external", 8000, JSONArray().put("id")))
        })
        .put("resources", JSONArray())
        .put("mcpServers", JSONArray().put(JSONObject().put("id", mcp.optString("id"))
            .put("transport", mcp.optString("transport")).put("url", mcp.optString("url"))))

    private fun schema(vararg names: String) = JSONObject().put("type", "object").put("properties", JSONObject().apply {
        names.forEach { put(it, JSONObject().put("type", "string")) }
    })

    private fun tool(name: String, description: String, inputSchema: JSONObject, sideEffects: String, timeoutMs: Int, required: JSONArray = JSONArray()) = JSONObject()
        .put("name", name).put("description", description).put("inputSchema", inputSchema.put("required", required))
        .put("sideEffects", sideEffects).put("timeoutHintMs", timeoutMs)

    private fun required(args: JSONObject, name: String): String = args.optString(name).trim().also {
        require(it.isNotBlank()) { "$name is required" }
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

    companion object {
        private val TOOLS = setOf("records.create", "records.list", "records.get", "records.update", "records.delete")
    }
}
