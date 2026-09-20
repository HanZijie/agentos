package com.example.agenriod.agent

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.IBinder
import com.example.agenriod.mcp.McpHttpSession
import com.example.agenriod.plugin.AgentPluginService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** Process-owned registrations. Discovery reads package metadata and never starts a plugin. */
@SuppressLint("StaticFieldLeak")
internal class ActivePluginCatalog private constructor(context: Context) {
    private val app = context.applicationContext
    private val io = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private class Entry(
        val owner: String, val descriptor: JSONObject, val endpoint: AgentPluginService,
        val death: IBinder.DeathRecipient, val servers: Map<String, McpHttpSession>,
    ) {
        val nativeExecutor = Executors.newSingleThreadExecutor()
        val nativeBusy = AtomicBoolean(false)
        var mcpTools = emptyMap<String, McpTool>()
        var connectedServers = 0
        var refreshing = false
        var mcpError = false
    }
    private data class McpTool(val session: McpHttpSession, val originalName: String, val descriptor: JSONObject)
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
        require(names.size <= 512 && names.distinct().size == names.size && names.none { it.startsWith("mcp.") }) { "Duplicate, excessive or reserved native tool name" }
        val configs = descriptor.optJSONArray("mcpServers") ?: JSONArray()
        require(configs.length() <= 8) { "At most 8 MCP servers per plugin" }
        val servers = mutableMapOf<String, McpHttpSession>()
        for (index in 0 until configs.length()) {
            val config = configs.getJSONObject(index)
            val serverId = config.getString("id")
            require(serverId.matches(Regex("[A-Za-z0-9_-]{1,32}")) && serverId !in servers) { "Invalid or duplicate MCP server id" }
            servers[serverId] = McpHttpSession(config)
        }
        val binder = endpoint.asBinder()
        val death = IBinder.DeathRecipient { remove(id, binder) }
        binder.linkToDeath(death, 0)
        entries.remove(id)?.let { dispose(it) }
        val entry = Entry(owner, descriptor, endpoint, death, servers)
        entries[id] = entry
        if (!binder.isBinderAlive) { remove(id, binder); return }
        revision.value++
        refreshMcp(id, entry)
    }
    @Synchronized fun unregister(uid: Int, id: String, endpoint: AgentPluginService) {
        val entry = entries[id] ?: return
        require(app.packageManager.getPackagesForUid(uid)?.contains(entry.owner) == true) { "Wrong plugin owner" }
        remove(id, endpoint.asBinder())
    }
    @Synchronized private fun remove(id: String, binder: IBinder) {
        val entry = entries[id]?.takeIf { it.endpoint.asBinder() == binder } ?: return
        entries.remove(id)
        dispose(entry)
        revision.value++
    }
    private fun dispose(entry: Entry) {
        runCatching { entry.endpoint.asBinder().unlinkToDeath(entry.death, 0) }
        entry.nativeExecutor.shutdownNow()
        entry.servers.values.forEach { session -> io.launch { session.close() } }
    }
    @Synchronized fun refreshMcp() { entries.forEach { (id, entry) -> refreshMcp(id, entry) } }
    @Synchronized private fun refreshMcp(id: String, entry: Entry) {
        if (entry.servers.isEmpty() || entry.refreshing || entries[id] !== entry) return
        entry.refreshing = true
        io.launch {
            val found = mutableMapOf<String, McpTool>()
            var connected = 0
            for ((serverId, session) in entry.servers) {
                val tools = runCatching { session.listTools() }.getOrNull() ?: continue
                connected++
                for (tool in tools) {
                    val name = "mcp.$serverId.${tool.getString("name")}"
                    val definition = JSONObject().put("name", name).put("description", tool.optString("description"))
                        .put("parameters", tool.getJSONObject("inputSchema")).put("source", "mcp").put("serverId", serverId)
                    found[name] = McpTool(session, tool.getString("name"), definition)
                }
            }
            synchronized(this@ActivePluginCatalog) {
                if (entries[id] !== entry) return@launch // Late initialization cannot reactivate a dead process.
                entry.mcpTools = found; entry.connectedServers = connected
                entry.refreshing = false; entry.mcpError = connected != entry.servers.size
                revision.value++
            }
        }
    }
    @Synchronized fun catalog(): List<JSONObject> = installed().distinctBy { it.first }.map { (id, owner, label) ->
        val entry = entries[id]?.takeIf { it.owner == owner && it.endpoint.asBinder().isBinderAlive }
        val tools = JSONArray()
        entry?.descriptor?.optJSONArray("tools")?.let { native -> for (i in 0 until native.length()) if (native.getJSONObject(i).optBoolean("enabled", true)) tools.put(native.getJSONObject(i)) }
        entry?.mcpTools?.values?.forEach { tools.put(it.descriptor) }
        val status = when {
            entry == null -> "Inactive · app process not registered"
            entry.refreshing -> "Active · connecting MCP"
            entry.mcpError -> "Active · MCP unavailable; refresh to retry"
            entry.servers.isNotEmpty() -> "Active · ${entry.connectedServers} MCP connected"
            else -> "Active · app process running"
        }
        JSONObject().put("id", id).put("name", entry?.descriptor?.optString("name", label) ?: label)
            .put("packageName", owner).put("protocolVersion", entry?.descriptor?.optInt("protocolVersion") ?: 2)
            .put("description", entry?.descriptor?.optString("description") ?: "Open this app to activate its tools")
            .put("active", entry != null).put("status", status).put("tools", tools)
    }
    @Synchronized fun promptSummary(): String = entries.values.flatMap { entry ->
        val servers = entry.descriptor.optJSONArray("mcpServers") ?: JSONArray()
        (0 until servers.length()).mapNotNull { index ->
            val server = servers.optJSONObject(index) ?: return@mapNotNull null
            "- Plugin ${entry.descriptor.optString("name", entry.owner)}, MCP server ${server.optString("id")}: ${server.optString("transport")} at ${com.example.agenriod.mcp.redactMcpAddress(server.optString("url"))}"
        }
    }.joinToString("\n")

    fun known(id: String) = installed().any { it.first == id }
    fun invoke(id: String, tool: String, args: JSONObject): String {
        val entry = synchronized(this) { entries[id]?.takeIf { it.endpoint.asBinder().isBinderAlive } }
            ?: error("Plugin $id is inactive. Open its app before using its tools.")
        val mcpTool = synchronized(this) { entry.mcpTools[tool] }
        if (mcpTool != null) {
            val result = try { mcpTool.session.callTool(mcpTool.originalName, args) }
            catch (failure: Exception) {
                synchronized(this) {
                    if (entries[id] === entry) {
                        entry.mcpTools = entry.mcpTools.filterValues { it.session !== mcpTool.session }
                        entry.mcpError = true; revision.value++
                    }
                }
                throw failure
            }
            if (mcpTool.session.toolsChanged) refreshMcp(id, entry)
            return result.toString()
        }
        val tools = entry.descriptor.optJSONArray("tools") ?: JSONArray()
        require((0 until tools.length()).any { tools.getJSONObject(it).let { t -> t.optString("name") == tool && t.optBoolean("enabled", true) } }) { "Plugin tool is unavailable: $tool" }
        check(entry.nativeBusy.compareAndSet(false, true)) { "Plugin still has an in-flight native call" }
        val future = try {
            entry.nativeExecutor.submit<String> {
                try { entry.endpoint.invoke(tool, args.toString()) } finally { entry.nativeBusy.set(false) }
            }
        } catch (failure: Exception) { entry.nativeBusy.set(false); throw failure }
        val response = try { JSONObject(future.get(15, TimeUnit.SECONDS)) }
        catch (failure: Exception) { future.cancel(true); throw IllegalStateException("Native plugin call failed; it was not replayed", failure) }
        if (response.has("error")) error(response.optString("error"))
        return response.toString()
    }
    companion object {
        const val PLUGIN_ID = "com.example.agenriod.PLUGIN_ID"
        @Volatile private var instance: ActivePluginCatalog? = null
        fun get(context: Context): ActivePluginCatalog = instance ?: synchronized(this) { instance ?: ActivePluginCatalog(context).also { instance = it } }
    }
}
