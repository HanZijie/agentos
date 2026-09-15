package com.example.agenriod.agent

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.IBinder
import com.example.agenriod.plugin.AgentPluginService
import org.json.JSONObject
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Discovers and invokes exported AgentPluginService implementations in other APKs. */
internal class AndroidPluginRegistry(context: Context) {
    private val app = context.applicationContext
    private val descriptors = mutableMapOf<String, JSONObject>()
    private fun components() = app.packageManager.queryIntentServices(Intent(ACTION), PackageManager.MATCH_ALL).mapNotNull { info -> info.serviceInfo?.let { ComponentName(it.packageName, it.name) } }
    @Synchronized fun list(): List<JSONObject> {
        val found = components()
        val result = found.mapNotNull { component ->
            val raw = bind(component) { it.describe() }
            if (raw == null) { android.util.Log.w("AgenriodPluginRegistry", "describe returned null for $component"); return@mapNotNull null }
            runCatching { JSONObject(raw).put("component", component.flattenToString()) }
                .onFailure { android.util.Log.w("AgenriodPluginRegistry", "descriptor parse failed for $component raw=${raw.take(120)}", it) }.getOrNull()
        }
        android.util.Log.i("AgenriodPluginRegistry", "resolved=${found.size} described=${result.size} ids=${result.map { it.optString("id") }}")
        descriptors.clear(); result.forEach { descriptors[it.optString("id")] = it }
        return result
    }
    @Synchronized fun has(id: String): Boolean = descriptors.containsKey(id) || list().any { it.optString("id") == id }
    fun invoke(id: String, tool: String, args: JSONObject): String {
        val descriptor = synchronized(this) { descriptors[id] ?: list().firstOrNull { it.optString("id") == id } }
        val component = descriptor?.optString("component")?.let(ComponentName::unflattenFromString) ?: error("External plugin not found: $id")
        return bind(component) { it.invoke(tool, args.toString()) } ?: error("External plugin did not respond: $id")
    }
    private fun <T> bind(component: ComponentName, action: (AgentPluginService) -> T): T? {
        val remote = AtomicReference<AgentPluginService?>()
        val connected = CountDownLatch(1)
        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName, service: IBinder) { remote.set(AgentPluginService.Stub.asInterface(service)); connected.countDown() }
            override fun onServiceDisconnected(name: ComponentName) { connected.countDown() }
        }
        if (!runCatching { app.bindService(Intent().setComponent(component), connection, Context.BIND_AUTO_CREATE) }
                .onFailure { android.util.Log.w("AgenriodPluginRegistry", "bindService threw for $component", it) }.getOrDefault(false)) {
            android.util.Log.w("AgenriodPluginRegistry", "bindService returned false for $component")
            return null
        }
        return try {
            if (!connected.await(3, TimeUnit.SECONDS)) { android.util.Log.w("AgenriodPluginRegistry", "bind timeout for $component"); return null }
            val service = remote.get() ?: run { android.util.Log.w("AgenriodPluginRegistry", "disconnected before use: $component"); return null }
            val executor = java.util.concurrent.Executors.newSingleThreadExecutor()
            try { executor.submit<T> { action(service) }.get(15, TimeUnit.SECONDS) } finally { executor.shutdownNow() }
        } finally { runCatching { app.unbindService(connection) } }
    }
    companion object { const val ACTION = "com.example.agenriod.action.AGENT_PLUGIN" }
}
