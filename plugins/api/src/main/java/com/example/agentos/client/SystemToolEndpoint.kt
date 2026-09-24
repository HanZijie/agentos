package com.example.agentos.client

import android.content.Context
import android.os.Binder
import android.util.AtomicFile
import com.example.agentos.*
import org.json.JSONObject
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/** App-owned tools. Credentials, model calls and task scheduling stay in sideagentd. */
open class SystemToolEndpoint(
    private val context: Context,
    descriptorResource: Int,
    private val invoke: (String, JSONObject, String) -> JSONObject,
) : IAgentPluginEndpoint.Stub(), AutoCloseable {
    private val descriptorText = context.resources.openRawResource(descriptorResource)
        .bufferedReader().use { it.readText() }
    private val descriptor = JSONObject(descriptorText)
    private val toolEffects = descriptor.getJSONArray("tools").let { tools ->
        (0 until tools.length()).associate {
            val tool = tools.getJSONObject(it)
            tool.getString("name") to tool.optString("sideEffects", "external")
        }
    }
    private val sessions = ConcurrentHashMap<String, Set<String>>()
    private val cancelled = ConcurrentHashMap.newKeySet<String>()
    private val executor = Executors.newSingleThreadExecutor()
    private val receipts = AtomicFile(File(context.filesDir, "agent-tool-receipts.json"))

    private fun systemCaller() = check(Binder.getCallingUid() == 1000) { "System broker required" }
    private fun runtimeCaller() = check(Binder.getCallingUid() == 1096) { "Native runtime required" }

    override fun openPluginSession(id: String, user: Int, version: String): AgentPluginDescriptor {
        systemCaller()
        sessions[id] = emptySet()
        return describe()
    }

    override fun openPluginSessionV2(id: String, host: AgentPluginHostInfo,
                                    callback: IAgentPluginHostCallback): AgentPluginDescriptor {
        systemCaller()
        sessions[id] = emptySet()
        return describe()
    }

    override fun sessionGranted(id: String, granted: AgentPluginCapabilities) {
        systemCaller()
        if (sessions.containsKey(id)) sessions[id] = granted.grantedTools.toSet().intersect(toolEffects.keys)
    }

    override fun closePluginSession(id: String, reason: String) {
        systemCaller()
        sessions.remove(id)
    }

    override fun beginInvoke(request: AgentPluginInvokeRequest, sink: IAgentPluginResultSink) {
        runtimeCaller()
        executor.execute {
            val result = runCatching {
                require(request.requestId.length in 1..512 && request.argsJson.length <= 65536) { "invalid_request" }
                require(request.tool in sessions[request.pluginSessionId].orEmpty()) { "capability_denied" }
                require(request.deadlineEpochMs > System.currentTimeMillis()) { "deadline_expired" }
                require(!cancelled.remove(request.requestId)) { "cancelled" }
                val arguments = JSONObject(request.argsJson)
                if (toolEffects[request.tool] == "none") invoke(request.tool, arguments, "")
                else mutate(request, arguments)
            }
            val reply = AgentPluginInvokeResult().apply {
                requestId = request.requestId
                generatedAtMs = System.currentTimeMillis()
                status = if (result.isSuccess) "ok" else "error"
                resultJson = result.getOrNull()?.toString().orEmpty()
                error = AgentPluginInvokeError().apply {
                    code = if (result.exceptionOrNull()?.message == "operation_unknown") "operation_unknown" else "tool_failed"
                    message = result.exceptionOrNull()?.message?.take(256).orEmpty()
                    retryable = false
                    dataJson = "{}"
                }
            }
            runCatching { sink.onResult(reply) }
        }
    }

    private fun mutate(request: AgentPluginInvokeRequest, args: JSONObject): JSONObject {
        require(request.idempotencyKey.length in 1..512) { "idempotency_key_required" }
        val ledger = if (receipts.baseFile.exists()) JSONObject(receipts.readFully().toString(Charsets.UTF_8)) else JSONObject()
        val key = request.idempotencyKey
        val previous = ledger.optJSONObject(key)
        if (previous != null) {
            require(previous.getString("tool") == request.tool && previous.getString("args") == request.argsJson) { "idempotency_conflict" }
            check(previous.optString("state") == "completed") { "operation_unknown" }
            return previous.getJSONObject("result")
        }
        val row = JSONObject().put("tool", request.tool).put("args", request.argsJson).put("state", "pending")
        ledger.put(key, row)
        save(ledger)  // Persist before any side effect; an interrupted attempt is not replayed.
        val value = invoke(request.tool, args, key)
        row.put("state", "completed").put("result", value)
        save(ledger)
        return value
    }

    private fun save(value: JSONObject) {
        val stream = receipts.startWrite()
        try {
            stream.write(value.toString().toByteArray())
            receipts.finishWrite(stream)
        } catch (error: Throwable) {
            receipts.failWrite(stream)
            throw error
        }
    }

    override fun beginReadResource(request: AgentPluginResourceRequest, sink: IAgentPluginResultSink) {
        runtimeCaller()
        sink.onResult(AgentPluginInvokeResult().apply {
            requestId = request.requestId
            status = "error"
            error = AgentPluginInvokeError().apply { code = "unknown_resource"; message = "No resource declared"; retryable = false; dataJson = "{}" }
        })
    }
    override fun cancelInvoke(id: String, request: String) { runtimeCaller(); cancelled.add(request) }
    override fun close() { sessions.clear(); executor.shutdown() }

    private fun describe() = AgentPluginDescriptor().apply {
        protocolVersion = 3
        pluginId = context.packageName
        packageName = context.packageName
        displayName = descriptor.getString("displayName")
        descriptorJson = descriptorText
    }
}
