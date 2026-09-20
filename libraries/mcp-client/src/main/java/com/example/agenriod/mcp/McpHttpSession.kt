package com.example.agenriod.mcp

import org.json.JSONArray
import org.json.JSONObject
import java.io.FilterInputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URI
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/** Streamable HTTP tools client. Each instance belongs to exactly one live plugin registration. */
fun redactMcpAddress(raw: String): String = runCatching {
    val uri = URI(raw)
    require(uri.scheme != null && uri.host != null)
    val authority = buildString { append(uri.host); if (uri.port >= 0) append(":").append(uri.port) }
    uri.scheme + "://" + authority + (uri.rawPath ?: "/") + if (uri.rawQuery != null) "?[query redacted]" else ""
}.getOrDefault("[invalid MCP URL]")

class McpHttpSession(config: JSONObject) : AutoCloseable {
    private val endpoint = URI(config.getString("url"))
    private val headers = config.optJSONObject("headers") ?: JSONObject()
    private val sequence = AtomicLong()
    private val sessionLock = Any()
    private val closed = AtomicBoolean(false)
    private val connections = ConcurrentHashMap.newKeySet<HttpURLConnection>()
    @Volatile private var sessionId: String? = null
    private var protocol = PROTOCOL
    private var initialized = false
    @Volatile var toolsChanged: Boolean = false
        private set

    init {
        require(config.optString("transport", "streamable-http") == "streamable-http") { "Only Streamable HTTP MCP is supported" }
        require(endpoint.scheme == "https" || (endpoint.scheme == "http" && endpoint.host in setOf("127.0.0.1", "localhost", "[::1]"))) { "MCP requires HTTPS or loopback HTTP" }
        require(endpoint.rawUserInfo == null && endpoint.rawFragment == null && endpoint.host != null) { "Invalid MCP endpoint" }
        headers.keys().forEach { key ->
            require(key.matches(Regex("[A-Za-z0-9-]+")) && key.lowercase() !in setOf("host", "content-length", "content-type", "accept", "mcp-session-id", "mcp-protocol-version")) { "Reserved MCP header" }
            require(!headers.getString(key).contains(Regex("[\r\n]"))) { "Invalid MCP header value" }
        }
    }

    @Synchronized fun listTools(): List<JSONObject> {
        initialize()
        val tools = mutableListOf<JSONObject>()
        val cursors = mutableSetOf<String>()
        var cursor: String? = null
        do {
            val params = JSONObject().apply { cursor?.let { put("cursor", it) } }
            val response = request("tools/list", params)
            val page = response.getJSONArray("tools")
            for (i in 0 until page.length()) {
                val tool = page.getJSONObject(i)
                require(tool.getString("name").matches(Regex("[A-Za-z0-9_.-]{1,128}"))) { "Invalid MCP tool name" }
                require(tool.getJSONObject("inputSchema").optString("type") == "object") { "MCP tool inputSchema must be an object schema" }
                tools += tool
                require(tools.size <= 512) { "MCP tool catalog exceeds 512 tools" }
            }
            cursor = response.optString("nextCursor").takeIf { it.isNotEmpty() }
            if (cursor != null) require(cursors.add(cursor) && cursors.size <= 64) { "Invalid MCP pagination" }
        } while (cursor != null)
        require(tools.map { it.getString("name") }.distinct().size == tools.size) { "Duplicate MCP tool name" }
        toolsChanged = false
        return tools
    }

    @Synchronized fun callTool(name: String, arguments: JSONObject): JSONObject {
        initialize()
        // Never automatically replay tools/call after a transport error or expired session.
        val result = request("tools/call", JSONObject().put("name", name).put("arguments", arguments))
        require(result.optJSONArray("content") != null) { "MCP tools/call result has no content" }
        return result
    }

    private fun initialize() {
        check(!closed.get()) { "MCP session is closed" }
        if (initialized) return
        try {
            val result = request("initialize", JSONObject().put("protocolVersion", PROTOCOL)
                .put("capabilities", JSONObject()).put("clientInfo", JSONObject().put("name", "agenriod").put("version", "0.2.0")), initializing = true)
            val negotiated = result.getString("protocolVersion")
            require(negotiated in SUPPORTED) { "Unsupported MCP protocol version" }
            require(result.getJSONObject("capabilities").has("tools")) { "MCP server does not support tools" }
            protocol = negotiated
            post(JSONObject().put("jsonrpc", "2.0").put("method", "notifications/initialized"), null, false)
            initialized = true
        } catch (failure: Exception) {
            val id = synchronized(sessionLock) { sessionId.also { sessionId = null } }
            id?.let(::finishSession)
            protocol = PROTOCOL
            throw failure
        }
    }

    private fun request(method: String, params: JSONObject, initializing: Boolean = false): JSONObject {
        val id = sequence.incrementAndGet()
        return checkNotNull(post(JSONObject().put("jsonrpc", "2.0").put("id", id).put("method", method).put("params", params), id, initializing))
    }

    private fun connection(method: String, deletingSession: String? = null): HttpURLConnection {
        val connection = endpoint.toURL().openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 5000
        connection.readTimeout = 15000
        connection.instanceFollowRedirects = false // Never forward plugin credentials to redirect targets.
        connection.setRequestProperty("Accept", "application/json, text/event-stream")
        headers.keys().forEach { connection.setRequestProperty(it, headers.getString(it)) }
        connection.setRequestProperty("MCP-Protocol-Version", protocol)
        (deletingSession ?: sessionId)?.let { connection.setRequestProperty("Mcp-Session-Id", it) }
        return connection
    }

    private fun post(message: JSONObject, id: Long?, initializing: Boolean): JSONObject? {
        check(!closed.get()) { "MCP session is closed" }
        val connection = connection("POST")
        connections += connection
        try {
            check(!closed.get()) { "MCP session is closed" }
            val bytes = message.toString().toByteArray(Charsets.UTF_8)
            require(bytes.size <= MAX_BYTES) { "MCP request is too large" }
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setFixedLengthStreamingMode(bytes.size)
            connection.outputStream.use { it.write(bytes) }
            val code = connection.responseCode
            if (code == 404 && sessionId != null) {
                synchronized(sessionLock) { sessionId = null }; initialized = false
                error("MCP session expired. This request was not replayed; retry explicitly.")
            }
            if (id == null) { check(code == 202) { "MCP notification rejected (HTTP $code)" }; return null }
            check(code == 200) { "MCP request failed (HTTP $code)" }
            if (initializing) {
                val receivedId = connection.getHeaderField("Mcp-Session-Id")?.also { value ->
                    require(value.isNotEmpty() && value.length <= 1024 && value.all { it.code in 0x21..0x7e }) { "Invalid MCP session id" }
                }
                synchronized(sessionLock) {
                    if (closed.get()) { receivedId?.let(::finishSession); error("MCP session is closed") }
                    sessionId = receivedId
                }
            }
            return limited(connection.inputStream).bufferedReader(Charsets.UTF_8).use { reader ->
                when (connection.contentType?.substringBefore(';')?.trim()?.lowercase()) {
                    "application/json" -> decode(JSONObject(reader.readText()), id) ?: error("MCP response id does not match request")
                    "text/event-stream" -> {
                        val deadline = System.nanoTime() + 30_000_000_000L
                        val data = StringBuilder()
                        var result: JSONObject? = null
                        while (result == null) {
                            check(!closed.get()) { "MCP session is closed" }
                            check(System.nanoTime() < deadline) { "MCP SSE response timed out" }
                            val line = reader.readLine() ?: error("MCP SSE stream ended before its response")
                            if (line.isEmpty() && data.isNotEmpty()) {
                                result = decode(JSONObject(data.toString()), id)
                                data.setLength(0)
                            } else if (line.startsWith("data:")) {
                                if (data.isNotEmpty()) data.append('\n')
                                data.append(line.substring(5).removePrefix(" "))
                            }
                        }
                        result
                    }
                    else -> error("Unsupported MCP response content type")
                }
            }
        } finally { connections -= connection; connection.disconnect() }
    }

    private fun decode(message: JSONObject, expectedId: Long): JSONObject? {
        require(message.optString("jsonrpc") == "2.0") { "Invalid MCP JSON-RPC version" }
        if (message.has("method")) {
            if (message.optString("method") == "notifications/tools/list_changed") toolsChanged = true
            if (message.has("id")) {
                val reply = JSONObject().put("jsonrpc", "2.0").put("id", message.get("id"))
                if (message.getString("method") == "ping") reply.put("result", JSONObject())
                else reply.put("error", JSONObject().put("code", -32601).put("message", "Client method not supported"))
                post(reply, null, false)
            }
            return null
        }
        if (message.opt("id")?.toString() != expectedId.toString()) return null
        if (message.has("error")) {
            // Server text can include request headers or secrets; expose the error code only.
            error("MCP protocol error ${message.getJSONObject("error").optInt("code")}")
        }
        return message.getJSONObject("result")
    }

    override fun close() {
        val id = synchronized(sessionLock) {
            if (!closed.compareAndSet(false, true)) return
            sessionId.also { sessionId = null }
        }
        connections.forEach { runCatching { it.disconnect() } }
        id?.let(::finishSession)
    }
    private fun finishSession(id: String) {
        // Best effort cleanup. A dead local owner cannot receive DELETE; remote sessions can.
        runCatching {
            connection("DELETE", id).apply { connectTimeout = 2000; readTimeout = 2000 }.let { connection ->
                try { connection.responseCode } finally { connection.disconnect() }
            }
        }
    }
    private fun limited(input: InputStream): InputStream = object : FilterInputStream(input) {
        private var count = 0
        override fun read(): Int = super.read().also { if (it >= 0) { count++; require(count <= MAX_BYTES) { "MCP response is too large" } } }
        override fun read(bytes: ByteArray, offset: Int, length: Int): Int = `in`.read(bytes, offset, length).also {
            if (it > 0) { count += it; require(count <= MAX_BYTES) { "MCP response is too large" } }
        }
    }
    companion object {
        const val PROTOCOL = "2025-11-25"
        private val SUPPORTED = setOf(PROTOCOL, "2025-06-18", "2025-03-26")
        private const val MAX_BYTES = 4 * 1024 * 1024
    }
}
