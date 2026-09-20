package com.example.agenriod.testing

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.example.agenriod.agent.AgentStore
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class LocalAnthropicConfigTest {
    @Test
    fun importsAnthropicConfigIntoKeystoreWithoutPlaintextPreference() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val preferences = "anthropic-import-${UUID.randomUUID()}"
        val key = "sk-local-import-test"
        val raw = JSONObjectBuilder.config(key).toString()
        try {
            assertTrue(LocalAnthropicConfig.apply(context, raw, preferences))
            val loaded = AgentStore(context, preferences).loadConfig()
            assertEquals("anthropic", loaded.provider)
            assertEquals(key, loaded.apiKey)
            assertEquals("claude-test", loaded.model)
            assertFalse(context.getSharedPreferences(preferences, 0).all.values.any { it.toString().contains(key) })
            assertFalse(LocalAnthropicConfig.apply(context, JSONObjectBuilder.config("").toString(), preferences))
            assertEquals(key, AgentStore(context, preferences).loadConfig().apiKey)
        } finally { context.deleteSharedPreferences(preferences) }
    }

    @Test
    fun rejectsMalformedAnthropicConfig() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val preferences = "anthropic-invalid-${UUID.randomUUID()}"
        try {
            assertThrows(IllegalArgumentException::class.java) { LocalAnthropicConfig.apply(context, "{\"provider\":\"openai\",\"apiKey\":\"sk\"}", preferences) }
            assertThrows(Exception::class.java) { LocalAnthropicConfig.apply(context, "{\"provider\":\"anthropic\",\"apiKey\":\"sk\",\"model\":\"m\",\"baseUrl\":\"https://api.example.test/v1?key=secret\",\"maxTokens\":1}", preferences) }
        } finally { context.deleteSharedPreferences(preferences) }
    }

    private object JSONObjectBuilder {
        fun config(key: String) = org.json.JSONObject().put("provider", "anthropic").put("apiKey", key)
            .put("model", "claude-test").put("baseUrl", "https://api.anthropic.com/v1").put("maxTokens", 8192)
    }
}
