package com.example.agenriod.testing

import android.app.Instrumentation
import android.content.Context
import android.os.ParcelFileDescriptor
import com.example.agenriod.agent.AgentStore
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.URI

/** Test-APK-only importer. Neither the env file nor credentials are packaged into either APK. */
internal object LocalAnthropicConfig {
    private val allowedPath = Regex("/data/local/tmp/agenriod-model-[a-f0-9-]{36}\\.json")

    fun importFile(instrumentation: Instrumentation, path: String, preferences: String = "agenriod_agent"): Boolean {
        require(allowedPath.matches(path)) { "Invalid local model config path" }
        val raw = try {
            ParcelFileDescriptor.AutoCloseInputStream(instrumentation.uiAutomation.executeShellCommand("cat $path")).use { input ->
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(4096)
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    require(output.size() + count <= 16 * 1024) { "Local model config exceeds 16 KiB" }
                    output.write(buffer, 0, count)
                }
                output.toString("UTF-8")
            }
        } finally {
            ParcelFileDescriptor.AutoCloseInputStream(instrumentation.uiAutomation.executeShellCommand("rm -f $path")).use { it.readBytes() }
        }
        return apply(instrumentation.targetContext, raw, preferences)
    }

    fun apply(context: Context, raw: String, preferences: String = "agenriod_agent"): Boolean {
        val json = JSONObject(raw)
        val key = json.optString("apiKey").trim()
        if (key.isEmpty()) return false
        require(json.getString("provider") == "anthropic") { "Only local Anthropic configuration is supported" }
        require(key.length <= 8192 && !key.contains('\n') && !key.contains('\r')) { "Invalid local API key" }
        val model = json.getString("model").trim()
        require(model.isNotEmpty() && model.length <= 256) { "Invalid local model id" }
        val baseUrl = json.getString("baseUrl")
        val url = URI(baseUrl)
        require(url.scheme in listOf("https", "http") && url.host != null && url.userInfo == null && url.fragment == null && url.query == null) { "Invalid local base URL" }
        val maxTokens = json.getInt("maxTokens")
        require(maxTokens > 0) { "Invalid local max tokens" }
        val store = AgentStore(context, preferences)
        val config = store.loadConfig().copy(provider = "anthropic", baseUrl = baseUrl, apiKey = key, model = model,
            maxTokens = maxTokens, displayName = "Anthropic", supportsVision = true)
        store.save(config, store.loadHooks())
        // A no-op synchronous commit waits for AgentStore's preceding apply before setup-only instrumentation exits.
        check(context.getSharedPreferences(preferences, Context.MODE_PRIVATE).edit().commit()) { "Could not persist local model configuration" }
        return true
    }
}
