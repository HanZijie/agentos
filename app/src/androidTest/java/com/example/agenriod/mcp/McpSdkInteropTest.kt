package com.example.agenriod.mcp

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.example.agenriod.agent.LocalMcpRegistry
import java.io.File
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class McpSdkInteropTest {
    @Test(timeout = 20000)
    fun talksToOfficialTypeScriptSdkStreamableHttpServer() {
        val port = InstrumentationRegistry.getArguments().getString("port")?.toIntOrNull() ?: error("-e port is required")
        McpHttpSession(JSONObject().put("url", "http://127.0.0.1:$port/mcp")).use { client ->
            assertEquals(listOf("greet"), client.listTools().map { it.getString("name") })
            val result = client.callTool("greet", JSONObject().put("name", "Agenriod"))
            assertEquals("Hello Agenriod", result.getJSONArray("content").getJSONObject(0).getString("text"))
        }
    }

    @Test(timeout = 20000)
    fun localAgenriodManifestCanExposeMcpTools() {
        val port = InstrumentationRegistry.getArguments().getString("port")?.toIntOrNull() ?: error("-e port is required")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val manifest = JSONObject().put("protocolVersion", 2).put("id", "local-sdk")
            .put("name", "Local SDK MCP").put("tools", org.json.JSONArray())
            .put("mcpServers", org.json.JSONArray().put(JSONObject().put("id", "sdk").put("transport", "streamable-http").put("url", "http://127.0.0.1:$port/mcp")))
        val registry = LocalMcpRegistry()
        val descriptors = registry.refresh(listOf(manifest))
        try {
            assertTrue(descriptors.single().getJSONArray("tools").toString().contains("mcp.sdk.greet"))
            val result = JSONObject(registry.invoke("local-sdk", "mcp.sdk.greet", JSONObject().put("name", "Agenriod")))
            assertEquals("Hello Agenriod", result.getJSONArray("content").getJSONObject(0).getString("text"))
        } finally { File(context.filesDir, "plugins/local-sdk.json").delete() }
    }
}
