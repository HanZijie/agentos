package com.example.agenriod.agent

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import androidx.test.platform.app.InstrumentationRegistry
import com.example.agenriod.plugin.AgentPluginHost
import org.json.JSONArray
import org.json.JSONObject

internal class PluginBrokerTestClient : ServiceConnection, AutoCloseable {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    @Volatile private var remote: AgentPluginHost? = null
    init { check(context.bindService(Intent(context, PluginHostService::class.java), this, Context.BIND_AUTO_CREATE)); await { remote != null } }
    override fun onServiceConnected(name: ComponentName, service: IBinder) { remote = AgentPluginHost.Stub.asInterface(service) }
    override fun onServiceDisconnected(name: ComponentName) { remote = null }
    fun catalog(): List<JSONObject> = remote?.let { JSONArray(it.catalog()) }.let { a -> (0 until (a?.length() ?: 0)).map { a!!.getJSONObject(it) } }
    fun invoke(id: String, tool: String, args: JSONObject): JSONObject = JSONObject(checkNotNull(remote).invoke(id, tool, args.toString()))
    fun awaitPlugin(id: String, active: Boolean): JSONObject {
        var result: JSONObject? = null
        await { result = runCatching { catalog().firstOrNull { it.optString("id") == id && it.optBoolean("active") == active } }.getOrNull(); result != null }
        return result!!
    }
    override fun close() { context.unbindService(this) }
    companion object {
        fun shell(command: String): String = ParcelFileDescriptor.AutoCloseInputStream(InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)).bufferedReader().use { it.readText().trim() }
        fun await(predicate: () -> Boolean) {
            val deadline = SystemClock.elapsedRealtime() + 15000
            while (SystemClock.elapsedRealtime() < deadline) { if (predicate()) return; Thread.sleep(50) }
            error("Timed out waiting for plugin lifecycle")
        }
    }
}
