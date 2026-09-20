package com.example.agenriod.plugin

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import java.util.concurrent.Executors

/** Keep one instance in Application. Activity onStop must not close this registration. */
class PluginProcessRegistration(
    context: Context,
    private val endpoint: AgentPluginService,
    private val host: ComponentName = ComponentName("com.example.agenriod", "com.example.agenriod.agent.PluginHostService"),
) : AutoCloseable {
    private val app = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private var bound = false
    @Volatile private var closed = false
    private var retryMs = 1000L
    private var remote: AgentPluginHost? = null
    private val reconnect = Runnable { connect() }
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, binder: IBinder) {
            val service = AgentPluginHost.Stub.asInterface(binder)
            remote = service
            io.execute {
                runCatching { service.registerPlugin(app.packageName, endpoint.describe(), endpoint) }
                    .onSuccess { retryMs = 1000L }
                    .onFailure { Log.w("PluginRegistration", "Host registration failed", it); main.post { rebind() } }
            }
        }
        override fun onServiceDisconnected(name: ComponentName) { remote = null /* Android reconnects the live binding. */ }
        override fun onBindingDied(name: ComponentName) { rebind() }
        override fun onNullBinding(name: ComponentName) { rebind() }
    }
    init { main.post { connect() } }
    private fun connect() {
        if (closed || bound) return
        bound = runCatching { app.bindService(Intent().setComponent(host), connection,
            Context.BIND_AUTO_CREATE or Context.BIND_NOT_FOREGROUND or Context.BIND_WAIVE_PRIORITY) }.getOrDefault(false)
        if (!bound) scheduleRetry()
    }
    private fun rebind() {
        if (bound) runCatching { app.unbindService(connection) }
        bound = false; remote = null
        scheduleRetry()
    }
    private fun scheduleRetry() {
        if (closed) return
        main.removeCallbacks(reconnect)
        main.postDelayed(reconnect, retryMs)
        retryMs = (retryMs * 2).coerceAtMost(30000L)
    }
    override fun close() {
        closed = true
        main.post {
            main.removeCallbacks(reconnect)
            val service = remote
            io.execute { runCatching { service?.unregisterPlugin(org.json.JSONObject(endpoint.describe()).getString("id"), endpoint) } }
            if (bound) runCatching { app.unbindService(connection) }
            bound = false; remote = null; io.shutdown()
        }
    }
}
