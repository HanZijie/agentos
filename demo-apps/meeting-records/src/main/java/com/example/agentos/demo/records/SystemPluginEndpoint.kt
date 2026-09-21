package com.example.agentos.demo.records

import android.content.Context
import com.example.agentos.AgentPluginDescriptor
import com.example.agentos.IAgentPluginEndpoint
import org.json.JSONArray
import org.json.JSONObject

/**
 * AOSP bootstrap endpoint. It is deliberately separate from the synchronous
 * migration endpoint used by the current Agenriod Host.
 */
internal class SystemPluginEndpoint(
    context: Context,
    private val repository: RecordsRepository,
    private val mcp: JSONObject,
) : IAgentPluginEndpoint.Stub() {
    private val packageName = context.packageName

    override fun openPluginSession(pluginSessionId: String, userId: Int, hostVersion: String): AgentPluginDescriptor {
        require(pluginSessionId.isNotBlank()) { "pluginSessionId is required" }
        return AgentPluginDescriptor().apply {
            protocolVersion = 3
            this.pluginId = packageName
            this.packageName = packageName
            displayName = "Meeting Records"
            descriptorJson = descriptor().toString()
        }
    }

    override fun closePluginSession(pluginSessionId: String, reason: String?) = Unit

    private fun descriptor(): JSONObject = JSONObject()
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
        // The AOSP bootstrap only carries the endpoint declaration. It does
        // not execute MCP yet, so credentials stay in the migration endpoint.
        .put("mcpServers", JSONArray().put(JSONObject().put("id", mcp.optString("id"))
            .put("transport", mcp.optString("transport"))
            .put("url", mcp.optString("url"))))

    private fun schema(vararg names: String): JSONObject = JSONObject().put("type", "object").put("properties", JSONObject().apply {
        names.forEach { put(it, JSONObject().put("type", "string")) }
    })

    private fun tool(name: String, description: String, inputSchema: JSONObject, sideEffects: String, timeoutMs: Int, required: JSONArray = JSONArray()): JSONObject = JSONObject()
        .put("name", name)
        .put("description", description)
        .put("inputSchema", inputSchema.put("required", required))
        .put("sideEffects", sideEffects)
        .put("timeoutHintMs", timeoutMs)
}
