package com.example.agenriod.agent

import android.content.Context
import com.dokar.quickjs.QuickJs
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject

class PiRuntime(
    private val context: Context,
    private val bridge: NativeAgentBridge,
    private val dispatcher: CoroutineDispatcher = Dispatchers.Default,
) {
    @Volatile private var quickJs: QuickJs? = null
    private val operations = Mutex()

    suspend fun start(config: ModelConfig, initialMessages: List<String> = emptyList(), sessionId: String = "default", runId: String = ""): Result<Unit> = withContext(dispatcher) {
        operations.withLock { runCatching {
            val runtime = quickJs ?: QuickJs.create(dispatcher).also { quickJs = it }
            bridge.defineBindings(runtime)
            if (runtime.isClosed) error("JavaScript runtime is closed")
            val source = context.assets.open("agenriod-agent.js").bufferedReader().use { it.readText() }
            runtime.evaluate<Any?>(source, "agenriod-agent.js", false)
            val configJson = JSONObject().apply {
                put("model", modelJson(config))
                put("systemPrompt", listOf(config.systemPrompt, bridge.systemPromptContext()).filter { it.isNotBlank() }.joinToString("\n\n"))
                put("sessionId", sessionId)
                put("runId", runId)
                put("initialMessages", org.json.JSONArray().apply { initialMessages.forEach { put(JSONObject(it)) } })
            }.toString()
            runtime.evaluate<Any?>("__agenriod_start(${JSONObject.quote(configJson)})", "start.js", false)
        }.map { Unit } }
    }

    suspend fun prompt(text: String, images: List<ImageAttachment> = emptyList()): Result<Unit> = withContext(dispatcher) {
        operations.withLock { runCatching {
            val runtime = quickJs ?: error("Runtime is not started")
            val payload = JSONObject().put("text", text)
            if (images.isNotEmpty()) payload.put("images", org.json.JSONArray().also { array -> images.forEach { array.put(JSONObject().put("type", "image").put("data", it.base64).put("mimeType", it.mimeType)) } })
            runtime.evaluate<Any?>("__agenriod_prompt(${JSONObject.quote(payload.toString())})", "prompt.js", false)
        }.map { Unit } }
    }

    suspend fun reset() = withContext(dispatcher) {
        operations.withLock { quickJs?.evaluate<Any?>("__agenriod_reset()", "reset.js", false) }
    }

    suspend fun historyJson(): String = withContext(dispatcher) {
        operations.withLock { quickJs?.evaluate<String>("JSON.stringify(__agenriod_history())", "history.js", false) ?: "[]" }
    }

    /** Interrupts a running QuickJS evaluation without waiting for its mutex. */
    fun abort() { bridge.cancelActiveOperations(); runCatching { quickJs?.interruptEvaluation() } }

    suspend fun close() = withContext(dispatcher) {
        operations.withLock { quickJs?.close(); quickJs = null }
    }

    private fun modelJson(config: ModelConfig): JSONObject = JSONObject().apply {
        put("id", config.model)
        put("name", config.displayName.ifBlank { config.model })
        put("api", if (config.provider.equals("anthropic", true)) "anthropic-messages" else "openai-completions")
        put("provider", config.provider)
        put("baseUrl", config.baseUrl)
        put("reasoning", false)
        put("input", org.json.JSONArray().put("text").put("image"))
        put("cost", JSONObject().put("input", 0).put("output", 0).put("cacheRead", 0).put("cacheWrite", 0))
        put("contextWindow", 128000)
        put("maxTokens", config.maxTokens)
    }
}

data class ImageAttachment(val base64: String, val mimeType: String)
