package com.example.agenriod.agent

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.IBinder
import com.example.agenriod.plugin.AgentPluginService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

/** Process-owned registrations. Discovery reads package metadata and never starts a plugin. */
internal class ActivePluginCatalog private constructor(context: Context) {
    private val app = context.applicationContext
    private data class Entry(val owner: String, val descriptor: JSONObject, val endpoint: AgentPluginService, val death: IBinder.DeathRecipient)
    private val entries = mutableMapOf<String, Entry>()
    private val revision = MutableStateFlow(0L)
    val changes = revision.asStateFlow()

    private fun installed() = app.packageManager.queryIntentServices(Intent(AndroidPluginRegistry.ACTION), PackageManager.GET_META_DATA)
        .mapNotNull { result -> result.serviceInfo?.let { info ->
            val id = info.metaData?.getString(PLUGIN_ID) ?: return@let null
            Triple(id, info.packageName, info.loadLabel(app.packageManager).toString())
        } }

    @Synchronized fun register(uid: Int, owner: String, raw: String, endpoint: AgentPluginService) {
        require(app.packageManager.getPackagesForUid(uid)?.contains(owner) == true) { "Plugin owner does not match caller UID" }
        require(raw.toByteArray().size <= 256 * 1024) { "Plugin descriptor exceeds 256 KiB" }
        val descriptor = JSONObject(raw)
        val id = descriptor.getString("id")
        require(id.matches(Regex("[A-Za-z0-9._-]{1,64}"))) { "Invalid plugin id" }
        require(descriptor.getInt("protocolVersion") in 1..2) { "Unsupported plugin protocol" }
        require(installed().any { it.first == id && it.second == owner }) { "Plugin id is not declared by the caller's APK" }
        require(entries[id]?.owner.let { it == null || it == owner }) { "Plugin id is owned by another package" }
        val tools = descriptor.optJSONArray("tools") ?: JSONArray()
        val names = (0 until tools.length()).map { tools.getJSONObject(it).getString("name") }
        require(names.distinct().size == names.size && names.none { it.startsWith("mcp.") }) { "Duplicate or reserved native tool name" }
        val binder = endpoint.asBinder()
        val death = IBinder.DeathRecipient { remove(id, binder) }
        binder.linkToDeath(death, 0)
        entries.remove(id)?.let { it.endpoint.asBinder().unlinkToDeath(it.death, 0) }
        entries[id] = Entry(owner, descriptor, endpoint, death)
        revision.value++
    }
    @Synchronized fun unregister(uid: Int, id: String, endpoint: AgentPluginService) {
        val entry = entries[id] ?: return
        require(app.packageManager.getPackagesForUid(uid)?.contains(entry.owner) == true) { "Wrong plugin owner" }
        remove(id, endpoint.asBinder())
    }
    @Synchronized private fun remove(id: String, binder: IBinder) {
        val entry = entries[id]?.takeIf { it.endpoint.asBinder() == binder } ?: return
        entries.remove(id)
        runCatching { binder.unlinkToDeath(entry.death, 0) }
        revision.value++
    }
    @Synchronized fun catalog(): List<JSONObject> = installed().distinctBy { it.first }.map { (id, owner, label) ->
        val entry = entries[id]?.takeIf { it.owner == owner && it.endpoint.asBinder().isBinderAlive }
        JSONObject().put("id", id).put("name", entry?.descriptor?.optString("name", label) ?: label)
            .put("packageName", owner).put("protocolVersion", entry?.descriptor?.optInt("protocolVersion") ?: 2)
            .put("description", entry?.descriptor?.optString("description") ?: "Open this app to activate its tools")
            .put("active", entry != null).put("status", if (entry != null) "Active · app process running" else "Inactive · app process not registered")
            .put("tools", entry?.descriptor?.optJSONArray("tools") ?: JSONArray())
    }
    fun known(id: String) = installed().any { it.first == id }
    fun invoke(id: String, tool: String, args: JSONObject): String {
        val entry = synchronized(this) { entries[id]?.takeIf { it.endpoint.asBinder().isBinderAlive } }
            ?: error("Plugin $id is inactive. Open its app before using its tools.")
        val tools = entry.descriptor.optJSONArray("tools") ?: JSONArray()
        require((0 until tools.length()).any { tools.getJSONObject(it).let { t -> t.optString("name") == tool && t.optBoolean("enabled", true) } }) { "Plugin tool is unavailable: $tool" }
        val response = JSONObject(entry.endpoint.invoke(tool, args.toString()))
        if (response.has("error")) error(response.optString("error"))
        return response.toString()
    }
    companion object {
        const val PLUGIN_ID = "com.example.agenriod.PLUGIN_ID"
        @Volatile private var instance: ActivePluginCatalog? = null
        fun get(context: Context): ActivePluginCatalog = instance ?: synchronized(this) { instance ?: ActivePluginCatalog(context).also { instance = it } }
    }
}
