package com.example.agentos.demo.alarm

import android.app.Service
import android.app.NotificationManager
import android.content.Intent
import android.os.IBinder
import com.example.agentos.client.SystemToolEndpoint
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDateTime
import java.time.ZoneId

class SystemPluginEndpointService : Service() {
    private lateinit var endpoint: SystemToolEndpoint
    override fun onCreate() {
        super.onCreate()
        val repository = AlarmRepository(this)
        endpoint = SystemToolEndpoint(this, R.raw.agentos_plugin) { tool, args, _ ->
            when (tool) {
                "alarm.list" -> JSONObject().put("alarms", JSONArray().apply { repository.list().forEach { put(it.toJson()) } })
                "alarm.create" -> {
                    val label = args.getString("label").trim()
                    require(label.isNotEmpty()) { "Alarm label is required" }
                    val local = LocalDateTime.parse(args.getString("date") + "T" + args.getString("time"))
                    val trigger = local.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    require(trigger > System.currentTimeMillis()) { "Alarm must be in the future" }
                    check(getSystemService(NotificationManager::class.java).areNotificationsEnabled()) { "Enable Alarm notifications first" }
                    val item = repository.create(label, trigger)
                    try { AlarmScheduler.schedule(this, item) }
                    catch (error: Exception) { repository.setEnabled(item.id, false); throw error }
                    JSONObject().put("ok", true).put("alarm", item.toJson()).put("timezone", ZoneId.systemDefault().id)
                }
                else -> error("Unknown alarm tool")
            }
        }
    }
    override fun onBind(intent: Intent?): IBinder = endpoint
    override fun onDestroy() { endpoint.close(); super.onDestroy() }
}
