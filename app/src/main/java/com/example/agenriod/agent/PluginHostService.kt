package com.example.agenriod.agent

import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import android.os.Process
import com.example.agenriod.plugin.AgentPluginHost
import com.example.agenriod.plugin.AgentPluginService
import org.json.JSONArray
import org.json.JSONObject

/** Public registration seam in :agent. Agent commands and state remain private. */
class PluginHostService : Service() {
    private val catalog by lazy { ActivePluginCatalog.get(applicationContext) }
    private val binder = object : AgentPluginHost.Stub() {
        override fun registerPlugin(packageName: String, descriptorJson: String, endpoint: AgentPluginService) =
            catalog.register(Binder.getCallingUid(), packageName, descriptorJson, endpoint)
        override fun unregisterPlugin(pluginId: String, endpoint: AgentPluginService) =
            catalog.unregister(Binder.getCallingUid(), pluginId, endpoint)
        override fun catalog(): String { enforceOwner(); return JSONArray(catalog.catalog()).toString() }
        override fun invoke(pluginId: String, tool: String, argsJson: String): String {
            enforceOwner()
            return runCatching { catalog.invoke(pluginId, tool, JSONObject(argsJson)) }
                .getOrElse { JSONObject().put("error", it.message ?: "Plugin call failed").toString() }
        }
        private fun enforceOwner() { check(Binder.getCallingUid() == Process.myUid()) { "Host access only" } }
    }
    override fun onBind(intent: Intent?): IBinder = binder
}
