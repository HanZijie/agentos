package com.example.agentos.demo.records

import android.content.Context
import com.example.agentos.client.SystemToolEndpoint
import org.json.JSONArray
import org.json.JSONObject

internal class SystemPluginEndpoint(context: Context, repository: RecordsRepository,
    @Suppress("UNUSED_PARAMETER") mcp: JSONObject) : SystemToolEndpoint(context, R.raw.agentos_plugin,
    { tool, args, _ ->
        when (tool) {
            "records.list" -> JSONObject().put("records", JSONArray().apply { repository.list(args.optString("query")).forEach { put(it.toJson()) } })
            "records.get" -> JSONObject().put("record", repository.get(args.getString("id"))?.toJson() ?: JSONObject.NULL)
            "records.create" -> {
                require(args.getString("title").isNotBlank() && args.getString("body").isNotBlank())
                JSONObject().put("record", repository.create(args.getString("title"), args.getString("body"), args.optString("meetingTime")).toJson()).put("ok", true)
            }
            "records.update" -> JSONObject().put("ok", true).put("record", repository.update(args.getString("id"), args.getString("title"), args.getString("body"), args.optString("meetingTime")).toJson())
            "records.delete" -> JSONObject().put("ok", repository.delete(args.getString("id")))
            else -> error("Unknown records tool")
        }
    })
