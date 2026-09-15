package com.example.agenriod.agent

import com.example.agenriod.mcp.McpHttpSession
import org.json.JSONArray
import org.json.JSONObject

/** Host-owned MCP sessions for manifests entered in Agenriod Settings. */
internal class LocalMcpRegistry {
    private data class Entry(val pluginId: String, val manifest: JSONObject, val sessions: Map<String, McpHttpSession>) {
        var signature: String = ""
        var tools: Map<String, JSONObject> = emptyMap()
        var error: Boolean = false
    }
    private val entries = mutableMapOf<String, Entry>()

    @Synchronized fun refresh(manifests: List<JSONObject>): List<JSONObject> {
        val nextIds = manifests.map { it.optString("id") }.toSet()
        entries.keys.filter { it !in nextIds }.toList().forEach { entries.remove(it)?.sessions?.values?.forEach(McpHttpSession::close) }
        return manifests.map { manifest ->
            val id = manifest.optString("id")
            val configs = manifest.optJSONArray("mcpServers") ?: JSONArray()
            val signature = configs.toString()
            val entry = entries[id]
            if (entry == null || entry.signature != signature) {
                entry?.sessions?.values?.forEach(McpHttpSession::close)
                val sessions = mutableMapOf<String, McpHttpSession>()
                for (index in 0 until configs.length()) {
                    val config = configs.getJSONObject(index)
                    val serverId = config.getString("id")
                    runCatching { sessions[serverId] = McpHttpSession(config) }
                }
                entries[id] = Entry(id, manifest, sessions).also { it.signature = signature }
            }
            val current = entries[id]!!
            val found = mutableMapOf<String, JSONObject>()
            for ((serverId, session) in current.sessions) {
                val tools = runCatching { session.listTools() }.getOrNull() ?: continue
                for (tool in tools) {
                    val name = "mcp.$serverId.${tool.getString("name")}"
                    found[name] = JSONObject().put("name", name).put("description", tool.optString("description"))
                        .put("parameters", tool.getJSONObject("inputSchema")).put("source", "mcp").put("serverId", serverId)
                }
            }
            current.tools = found
            current.error = current.sessions.isNotEmpty() && found.isEmpty()
            sanitized(current)
        }
    }

    @Synchronized fun invoke(pluginId: String, tool: String, args: JSONObject): String? {
        val entry = entries[pluginId] ?: return null
        val definition = entry.tools[tool] ?: return null
        val serverId = definition.optString("serverId")
        val server = entry.sessions[serverId] ?: error("MCP server is unavailable: $serverId")
        val original = tool.removePrefix("mcp.$serverId.")
        return server.callTool(original, args).toString()
    }

    @Synchronized fun promptSummary(): String = entries.values.flatMap { entry ->
        val servers = entry.manifest.optJSONArray("mcpServers") ?: JSONArray()
        (0 until servers.length()).mapNotNull { index ->
            val server = servers.optJSONObject(index) ?: return@mapNotNull null
            "- Plugin ${entry.pluginId}, MCP server ${server.optString("id")}: ${server.optString("transport")} at ${server.optString("url")}"
        }
    }.joinToString("\n")

    private fun sanitized(entry: Entry): JSONObject {
        val output = JSONObject(entry.manifest.toString())
        output.remove("mcpServers")
        val tools = JSONArray()
        output.optJSONArray("tools")?.let { native -> for (i in 0 until native.length()) tools.put(native.getJSONObject(i)) }
        entry.tools.values.forEach(tools::put)
        return output.put("tools", tools).put("active", true).put("status", when {
            entry.sessions.isEmpty() -> "Active · Agent Host running"
            entry.error -> "Active · MCP unavailable; refresh to retry"
            else -> "Active · ${entry.sessions.size} MCP connected"
        })
    }
}
