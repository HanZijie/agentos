package com.example.agenriod.agent

import android.content.Context
import org.json.JSONObject

/** Queries registrations in the Host process; never binds to or wakes a plugin APK. */
internal class AndroidPluginRegistry(context: Context) {
    private val catalog = ActivePluginCatalog.get(context)
    val changes = catalog.changes
    fun catalog(): List<JSONObject> = catalog.catalog()
    fun list(): List<JSONObject> = catalog().filter { it.optBoolean("active") }
    fun refresh() = catalog.refreshMcp()
    fun promptSummary() = catalog.promptSummary()
    fun has(id: String): Boolean = catalog.known(id)
    fun invoke(id: String, tool: String, args: JSONObject): String = catalog.invoke(id, tool, args)
    companion object { const val ACTION = "com.example.agenriod.action.AGENT_PLUGIN" }
}
