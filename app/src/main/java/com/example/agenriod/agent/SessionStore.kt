package com.example.agenriod.agent

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

data class SessionDocument(
    val summary: SessionSummary,
    val rawMessages: List<String>,
    val uiMessages: List<ChatMessage>,
)

class SessionStore(context: Context, storageDirectory: File = File(context.applicationContext.filesDir, "sessions")) {
    private val directory = storageDirectory.apply { mkdirs() }

    fun create(): SessionDocument = SessionDocument(
        SessionSummary(UUID.randomUUID().toString(), "New session", System.currentTimeMillis()),
        emptyList(),
        emptyList(),
    )

    fun list(): List<SessionSummary> = directory.listFiles { file -> file.extension == "json" }
        .orEmpty()
        .mapNotNull { runCatching { read(it.nameWithoutExtension).summary }.getOrNull() }
        .sortedByDescending { it.updatedAt }

    fun read(id: String): SessionDocument {
        val file = fileFor(id)
        if (!file.exists()) return SessionDocument(SessionSummary(id, "New session", 0L), emptyList(), emptyList())
        val json = JSONObject(file.readText())
        val raw = json.optJSONArray("rawMessages").toStringList()
        val ui = json.optJSONArray("uiMessages").toChatMessages()
        return SessionDocument(
            SessionSummary(id, json.optString("title", "New session"), json.optLong("updatedAt", 0L)),
            raw,
            ui,
        )
    }

    fun save(document: SessionDocument) {
        val json = JSONObject().apply {
            put("title", document.summary.title)
            put("updatedAt", document.summary.updatedAt)
            put("rawMessages", JSONArray().apply { document.rawMessages.forEach { put(JSONObject(it)) } })
            put("uiMessages", JSONArray().apply { document.uiMessages.forEach { message -> put(JSONObject().apply {
                put("id", message.id)
                put("role", message.role)
                put("text", message.text)
                put("toolName", message.toolName)
                put("isError", message.isError)
                put("isStreaming", false)
            }) } })
        }
        fileFor(document.summary.id).writeText(json.toString())
    }

    fun delete(id: String) { fileFor(id).delete() }

    private fun fileFor(id: String): File {
        require(id.matches(Regex("[A-Za-z0-9-]+"))) { "Invalid session id" }
        return File(directory, "$id.json")
    }
}

private fun JSONArray?.toStringList(): List<String> = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it)?.toString() }

private fun JSONArray?.toChatMessages(): List<ChatMessage> = if (this == null) emptyList() else (0 until length()).mapNotNull { index ->
    optJSONObject(index)?.let { json -> ChatMessage(
        id = json.optString("id"),
        role = json.optString("role"),
        text = json.optString("text"),
        toolName = json.optString("toolName").ifBlank { null },
        isError = json.optBoolean("isError"),
        isStreaming = false,
    ) }
}
