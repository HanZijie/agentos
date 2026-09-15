package com.example.agenriod.notes

import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.example.agenriod.plugin.AgentPluginService
import org.json.JSONArray
import org.json.JSONObject
import android.content.Context

/** Separate APK proof of the Android Agent Plugin Interface. */
class NotesPluginService : Service() {
    override fun onBind(intent: Intent?): IBinder = (application as NotesApplication).endpoint
}

class NotesPluginEndpoint(context: Context) : AgentPluginService.Stub() {
    private val repository = NotesRepository(context)
        // Named PLUGIN_DESCRIPTOR: inside Stub, `DESCRIPTOR` resolves to the
        // AIDL-generated interface-name constant and would shadow ours.
        override fun describe(): String = PLUGIN_DESCRIPTOR
        override fun invoke(tool: String, argsJson: String): String = runCatching {
            val args = JSONObject(argsJson)
            when (tool) {
                "notes.search" -> JSONObject().put("notes", repository.search(args.optString("query"))).toString()
                "notes.update" -> JSONObject().put("ok", true).put("notes", repository.update(args.optString("id"), args.optString("title"), args.optString("body"))).toString()
                else -> error("Unknown notes tool: $tool")
            }
        }.getOrElse { JSONObject().put("error", it.message ?: "Notes plugin failed").toString() }
    companion object {
        val PLUGIN_DESCRIPTOR = JSONObject().put("protocolVersion", 1).put("id", "notes").put("name", "Notes").put("description", "Search and update private notes").put("tools", JSONArray().apply {
            put(JSONObject().put("name", "notes.search").put("description", "Search notes").put("parameters", JSONObject().put("type", "object").put("properties", JSONObject().put("query", JSONObject().put("type", "string")))))
            put(JSONObject().put("name", "notes.update").put("description", "Create or update a note").put("parameters", JSONObject().put("type", "object").put("properties", JSONObject().put("id", JSONObject().put("type", "string")).put("title", JSONObject().put("type", "string")).put("body", JSONObject().put("type", "string"))).put("required", JSONArray().put("title").put("body"))))
        }).toString()
    }
}
