package com.example.agenriod.agent

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.*
import android.util.Log
import com.example.agenriod.MainActivity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import org.json.JSONObject

/** Owns the host in :agent; APK persistence uses a visible foreground service. */
class AgentService : Service() {
    private lateinit var host: AgentHost
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val callbacks = RemoteCallbackList<IAgentServiceCallback>()
    private var revision = 0L
    private val binder = object : IAgentService.Stub() {
        override fun registerCallback(callback: IAgentServiceCallback) {
            enforceOwner()
            scope.launch { callbacks.register(callback); sendSnapshot(callback, ++revision, host.state.value.toJson()) }
        }
        override fun unregisterCallback(callback: IAgentServiceCallback) { enforceOwner(); callbacks.unregister(callback) }
        override fun command(name: String, payload: ParcelFileDescriptor): String {
            enforceOwner()
            return runCatching {
                val json = JSONObject(JsonParcel.read(payload))
                runBlocking(Dispatchers.Main.immediate) { dispatch(name, json) }
                JSONObject().put("ok", true).toString()
            }.getOrElse { JSONObject().put("ok", false).put("error", it.message ?: "Command failed").toString() }
        }
        private fun enforceOwner() { check(Binder.getCallingUid() == Process.myUid()) { "Host IPC is private to this application" } }
    }
    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("agent", "Agent service", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = Notification.Builder(this, "agent").setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Agenriod is available").setContentText("Agent tasks continue in the background").setContentIntent(open).setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(1, notification)
        host = AgentHost(applicationContext)
        scope.launch {
            host.state.collect { state ->
                val sequence = ++revision
                val json = state.toJson()
                val count = callbacks.beginBroadcast()
                try { for (i in 0 until count) sendSnapshot(callbacks.getBroadcastItem(i), sequence, json) }
                finally { callbacks.finishBroadcast() }
            }
        }
        Log.i(TAG, "created pid=${Process.myPid()}")
    }
    private suspend fun sendSnapshot(callback: IAgentServiceCallback, sequence: Long, json: String) {
        withContext(Dispatchers.IO) { runCatching { JsonParcel.write(this@AgentService, json).use { callback.onStateChanged(sequence, it) } } }
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "started startId=$startId recovered=${intent == null}")
        return START_STICKY
    }
    override fun onBind(intent: Intent?): IBinder = binder
    override fun onDestroy() { host.close(); callbacks.kill(); scope.cancel(); Log.i(TAG, "destroyed"); super.onDestroy() }
    private suspend fun dispatch(name: String, json: JSONObject) {
        when (name) {
            "send" -> {
                val images = json.optJSONArray("images")
                host.submit(json.getString("text"), (0 until (images?.length() ?: 0)).map { images!!.getJSONObject(it).let { image -> ImageAttachment(image.getString("base64"), image.getString("mimeType")) } }, json.getString("id"))
            }
            "abort" -> host.abort()
            "reload", "refreshPlugins" -> host.reload()
            "saveSettings" -> host.saveSettings(json.getJSONObject("config").toModelConfig(), json.optString("hooks"), json.optString("manifest"))
            "deletePlugin" -> host.deletePlugin(json.getString("id"))
            "newSession" -> host.newSession()
            "switchSession" -> host.switchSession(json.getString("id"))
            "renameSession" -> host.renameSession(json.getString("id"), json.getString("title"))
            "deleteSession" -> host.deleteSession(json.getString("id"))
            "cancelTask" -> host.cancelTask(json.getString("id"))
            "retryTask" -> host.retryTask(json.getString("id"))
            else -> error("Unknown command: $name")
        }
    }
    companion object { private const val TAG = "AgenriodAgentService" }
}
