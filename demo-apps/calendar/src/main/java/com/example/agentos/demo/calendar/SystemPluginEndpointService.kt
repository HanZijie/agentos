package com.example.agentos.demo.calendar

import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.example.agentos.client.SystemToolEndpoint
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalTime

class SystemPluginEndpointService : Service() {
    private lateinit var endpoint: SystemToolEndpoint
    override fun onCreate() {
        super.onCreate()
        val repository = CalendarRepository(this)
        endpoint = SystemToolEndpoint(this, R.raw.agentos_plugin) { tool, args, _ ->
            when (tool) {
                "calendar.list", "todo.list" -> JSONObject().put("items", JSONArray().apply {
                    repository.list().filter { (it.kind == "todo") == (tool == "todo.list") }.forEach { put(it.toJson()) }
                })
                "calendar.create", "todo.create" -> {
                    val todo = tool == "todo.create"
                    val title = args.getString("title").trim()
                    require(title.isNotEmpty()) { "Title is required" }
                    val date = LocalDate.parse(args.getString(if (todo) "dueDate" else "date")).toString()
                    val start = if (todo) "" else LocalTime.parse(args.getString("startTime")).toString()
                    val end = if (todo) "" else LocalTime.parse(args.getString("endTime")).toString()
                    require(todo || end > start) { "Event end must be after start" }
                    val entry = repository.create(title, date, start, end, args.optString("location"),
                        args.optString("notes"), if (todo) "todo" else "event")
                    JSONObject().put("ok", true).put("item", entry.toJson())
                }
                "todo.complete" -> JSONObject().put("ok", true).put("item", repository.complete(args.getString("id")).toJson())
                else -> error("Unknown calendar tool")
            }
        }
    }
    override fun onBind(intent: Intent?): IBinder = endpoint
    override fun onDestroy() { endpoint.close(); super.onDestroy() }
}
