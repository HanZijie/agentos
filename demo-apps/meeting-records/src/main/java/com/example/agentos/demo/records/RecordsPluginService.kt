package com.example.agentos.demo.records

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import com.example.agenriod.plugin.AgentPluginService
import org.json.JSONArray
import org.json.JSONObject

class RecordsPluginService : Service() {
    override fun onBind(intent: Intent?): IBinder = (application as RecordsApplication).endpoint
}

/** Binder endpoint kept in the records process; the host never loads this code. */
internal class RecordsPluginEndpoint(
    private val repository: RecordsRepository,
    private val mcp: JSONObject,
) : AgentPluginService.Stub() {
    override fun describe(): String = descriptor(mcp).toString()

    override fun invoke(tool: String, argsJson: String): String = runCatching {
        val args = JSONObject(argsJson)
        when (tool) {
            "records.create" -> {
                val record = repository.create(
                    title = required(args, "title"),
                    body = required(args, "body"),
                    meetingTime = args.optString("meetingTime"),
                )
                JSONObject().put("ok", true).put("record", record.toJson()).toString()
            }
            "records.list" -> JSONObject().put("records", JSONArray().apply {
                repository.list(args.optString("query")).forEach { put(it.toJson()) }
            }).toString()
            "records.get" -> JSONObject().put("record", repository.get(required(args, "id"))?.toJson() ?: JSONObject.NULL).toString()
            "records.update" -> {
                val record = repository.update(
                    id = required(args, "id"),
                    title = required(args, "title"),
                    body = required(args, "body"),
                    meetingTime = args.optString("meetingTime"),
                )
                JSONObject().put("ok", true).put("record", record.toJson()).toString()
            }
            "records.delete" -> JSONObject().put("ok", repository.delete(required(args, "id"))).toString()
            else -> error("Unknown records tool: $tool")
        }
    }.getOrElse { JSONObject().put("error", it.message ?: "Records plugin failed").toString() }

    private fun required(args: JSONObject, name: String): String = args.optString(name).trim().also {
        require(it.isNotBlank()) { "$name is required" }
    }

    companion object {
        private fun property(type: String, description: String): JSONObject = JSONObject()
            .put("type", type)
            .put("description", description)

        private fun tool(name: String, description: String, properties: JSONObject, required: JSONArray = JSONArray()): JSONObject = JSONObject()
            .put("name", name)
            .put("description", description)
            .put("parameters", JSONObject().put("type", "object").put("properties", properties).put("required", required))

        fun descriptor(mcp: JSONObject): JSONObject {
            val title = property("string", "Meeting title")
            val body = property("string", "Meeting notes body")
            val time = property("string", "Human-readable meeting time")
            val id = property("string", "Record id")
            val query = property("string", "Text to search in title, body or time")
            return JSONObject()
                .put("protocolVersion", 2)
                .put("id", "meeting-records")
                .put("name", "Meeting Records")
                .put("description", "Create, read, update and delete local meeting minutes")
                .put("tools", JSONArray().apply {
                    put(tool("records.create", "Create a meeting record", JSONObject().put("title", title).put("body", body).put("meetingTime", time), JSONArray().put("title").put("body")))
                    put(tool("records.list", "List meeting records", JSONObject().put("query", query)))
                    put(tool("records.get", "Read one meeting record", JSONObject().put("id", id), JSONArray().put("id")))
                    put(tool("records.update", "Update one meeting record", JSONObject().put("id", id).put("title", title).put("body", body).put("meetingTime", time), JSONArray().put("id").put("title").put("body")))
                    put(tool("records.delete", "Delete one meeting record", JSONObject().put("id", id), JSONArray().put("id")))
                })
                .put("mcpServers", JSONArray().put(mcp))
        }
    }
}
