package com.example.agenriod.agent

import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import org.json.JSONArray
import org.json.JSONObject

internal fun AgentHostState.toJson(): String = JSONObject().apply {
    put("messages", JSONArray().apply { messages.forEach { put(JSONObject().apply {
        put("id", it.id); put("role", it.role); put("text", it.text); put("toolName", it.toolName ?: JSONObject.NULL)
        put("isError", it.isError); put("isStreaming", it.isStreaming)
    }) } })
    put("config", config.toJson())
    put("hooks", hooks)
    put("pluginCount", pluginCount)
    put("isRunning", isRunning)
    put("status", status)
    put("currentSession", currentSession.toJson())
    put("sessions", JSONArray().apply { sessions.forEach { put(it.toJson()) } })
    put("plugins", JSONArray().apply { plugins.forEach { put(it.toJson()) } })
    put("skills", JSONArray().apply { skills.forEach { put(it.toJson()) } })
    put("tasks", JSONArray().apply { tasks.forEach { put(JSONObject().put("id", it.id).put("sessionId", it.sessionId).put("prompt", it.prompt).put("status", it.status).put("error", it.error)) } })
}.toString()

internal fun stateFromJson(raw: String): AgentHostState {
    val json = JSONObject(raw)
    return AgentHostState(
        messages = json.optJSONArray("messages").toMessages(),
        config = json.optJSONObject("config")?.toModelConfig() ?: ModelConfig(),
        hooks = json.optString("hooks"), pluginCount = json.optInt("pluginCount"), isRunning = json.optBoolean("isRunning"),
        status = json.optString("status", "Ready"),
        currentSession = json.optJSONObject("currentSession")?.toSessionSummary() ?: SessionSummary("default", "New session", 0L),
        sessions = json.optJSONArray("sessions").toSessions(), plugins = json.optJSONArray("plugins").toPlugins(), skills = json.optJSONArray("skills").toSkills(),
        tasks = json.optJSONArray("tasks").toTasks(),
    )
}

internal fun ModelConfig.toJson() = JSONObject().apply {
    put("provider", provider); put("baseUrl", baseUrl); put("apiKey", apiKey); put("model", model); put("displayName", displayName); put("supportsVision", supportsVision); put("maxTokens", maxTokens); put("systemPrompt", systemPrompt)
}
internal fun JSONObject.toModelConfig() = ModelConfig(optString("provider", "openai-compatible"), optString("baseUrl", "https://api.openai.com/v1"), optString("apiKey"), optString("model", "gpt-4o-mini"), optString("displayName", "OpenAI-compatible"), optBoolean("supportsVision", true), optInt("maxTokens", 4096), optString("systemPrompt"))
private fun SessionSummary.toJson() = JSONObject().put("id", id).put("title", title).put("updatedAt", updatedAt)
private fun JSONObject.toSessionSummary() = SessionSummary(optString("id"), optString("title", "New session"), optLong("updatedAt"))
private fun PluginSummary.toJson() = JSONObject().put("id", id).put("name", name).put("description", description).put("toolCount", toolCount).put("active", active).put("status", status).put("packageName", packageName)
private fun JSONObject.toPlugin() = PluginSummary(optString("id"), optString("name"), optString("description"), optInt("toolCount"), optBoolean("active", true), optString("status"), optString("packageName"))
private fun SkillDefinition.toJson() = JSONObject().put("name", name).put("description", description).put("instruction", instruction)
private fun JSONObject.toSkill() = SkillDefinition(optString("name"), optString("description"), optString("instruction"))
private fun JSONArray?.toMessages() = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.let { j -> ChatMessage(j.optString("id"), j.optString("role"), j.optString("text"), if (j.isNull("toolName")) null else j.optString("toolName").ifBlank { null }, j.optBoolean("isError"), j.optBoolean("isStreaming")) } }
private fun JSONArray?.toSessions() = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.toSessionSummary() }
private fun JSONArray?.toPlugins() = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.toPlugin() }
private fun JSONArray?.toSkills() = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.toSkill() }

private fun JSONArray?.toTasks() = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.let { j -> TaskSummary(j.optString("id"), j.optString("sessionId"), j.optString("prompt"), j.optString("status"), j.optString("error")) } }
