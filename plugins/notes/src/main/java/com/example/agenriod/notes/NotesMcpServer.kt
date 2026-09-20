package com.example.agenriod.notes

import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/** A small authenticated, loopback Streamable HTTP MCP server owned by the Notes process. */
internal class NotesMcpServer(private val repository: NotesRepository) {
    private val server = ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"))
    private val token = UUID.randomUUID().toString()
    private val sessions = ConcurrentHashMap<String, Boolean>()
    private val workers = Executors.newFixedThreadPool(2)
    val configuration: JSONObject get() = JSONObject().put("id", "notes").put("transport", "streamable-http")
        .put("url", "http://127.0.0.1:${server.localPort}/mcp")
        .put("headers", JSONObject().put("Authorization", "Bearer $token"))

    init {
        thread(name = "notes-mcp-listener", isDaemon = true) {
            while (!server.isClosed) {
                val socket = runCatching { server.accept() }.getOrNull() ?: break
                workers.execute { runCatching { socket.use { handle(it) } } }
            }
        }
    }
    private fun handle(socket: Socket) {
        socket.soTimeout = 10000
        val input = socket.getInputStream()
        val request = line(input)?.split(' ') ?: return
        if (request.size < 3 || request[1] != "/mcp") { respond(socket, 404); return }
        val headers = mutableMapOf<String, String>()
        while (true) {
            val line = line(input) ?: return
            if (line.isEmpty()) break
            val separator = line.indexOf(':')
            if (separator <= 0 || headers.size >= 64) { respond(socket, 400); return }
            headers[line.substring(0, separator).lowercase()] = line.substring(separator + 1).trim()
        }
        process(socket, request[0], headers, input)
    }

    private fun process(socket: Socket, method: String, headers: Map<String, String>, input: InputStream) {
        if (headers["authorization"] != "Bearer $token" || headers.containsKey("origin")) { respond(socket, 403); return }
        val sessionId = headers["mcp-session-id"]
        if (method == "GET") { respond(socket, 405); return }
        if (method == "DELETE") {
            if (sessionId == null || sessions.remove(sessionId) == null) respond(socket, 404) else respond(socket, 200)
            return
        }
        if (method != "POST") { respond(socket, 405); return }
        val size = headers["content-length"]?.toIntOrNull()
        if (size == null || size !in 1..(1024 * 1024) || headers.containsKey("transfer-encoding")) { respond(socket, 400); return }
        val body = ByteArray(size)
        var offset = 0
        while (offset < size) { val count = input.read(body, offset, size - offset); if (count < 0) return; offset += count }
        val message = runCatching { JSONObject(String(body, Charsets.UTF_8)) }.getOrNull()
        if (message == null || message.optString("jsonrpc") != "2.0") { respond(socket, 400); return }
        val rpcMethod = message.optString("method")
        if (rpcMethod == "initialize") {
            if (sessions.size >= 64) { respond(socket, 503); return }
            val id = UUID.randomUUID().toString()
            sessions[id] = false
            val result = JSONObject().put("protocolVersion", "2025-11-25").put("capabilities", JSONObject().put("tools", JSONObject()))
                .put("serverInfo", JSONObject().put("name", "notes-mcp").put("version", "1.0.0"))
            respond(socket, 200, result(message, result), id)
            return
        }
        if (sessionId == null || !sessions.containsKey(sessionId)) { respond(socket, 404); return }
        if (headers["mcp-protocol-version"] != "2025-11-25") { respond(socket, 400); return }
        if (rpcMethod == "notifications/initialized") { sessions[sessionId] = true; respond(socket, 202); return }
        if (!message.has("id")) { respond(socket, 202); return }
        if (sessions[sessionId] != true) { respond(socket, 400); return }
        when (rpcMethod) {
            "ping" -> respond(socket, 200, result(message, JSONObject()))
            "tools/list" -> respond(socket, 200, result(message, JSONObject().put("tools", JSONArray().put(
                JSONObject().put("name", "notes.stats").put("description", "Count notes stored in the running Notes app")
                    .put("inputSchema", JSONObject().put("type", "object").put("properties", JSONObject()))))))
            "tools/call" -> {
                val args = message.optJSONObject("params")
                if (args?.optString("name") != "notes.stats") {
                    respond(socket, 200, JSONObject().put("jsonrpc", "2.0").put("id", message.get("id"))
                        .put("error", JSONObject().put("code", -32602).put("message", "Unknown tool")))
                    return
                }
                val stats = JSONObject().put("noteCount", repository.search("").length()).put("transport", "streamable-http")
                val output = JSONObject().put("content", JSONArray().put(JSONObject().put("type", "text").put("text", stats.toString())))
                    .put("structuredContent", stats).put("isError", false)
                respond(socket, 200, result(message, output))
            }
            else -> respond(socket, 200, JSONObject().put("jsonrpc", "2.0").put("id", message.get("id"))
                .put("error", JSONObject().put("code", -32601).put("message", "Method not found")))
        }
    }
    private fun result(request: JSONObject, value: JSONObject) = JSONObject().put("jsonrpc", "2.0").put("id", request.get("id")).put("result", value)
    private fun respond(socket: Socket, code: Int, body: JSONObject? = null, sessionId: String? = null) {
        val bytes = body?.toString()?.toByteArray(Charsets.UTF_8) ?: ByteArray(0)
        val header = "HTTP/1.1 $code ${if (code == 200) "OK" else "Response"}\r\nContent-Type: application/json\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n" +
            (sessionId?.let { "Mcp-Session-Id: $it\r\n" } ?: "") + "\r\n"
        socket.getOutputStream().apply { write(header.toByteArray(Charsets.US_ASCII)); write(bytes); flush() }
    }
    private fun line(input: InputStream): String? {
        val bytes = ByteArrayOutputStream()
        while (bytes.size() < 8192) {
            val value = input.read()
            if (value == -1) return null
            if (value == 10) return bytes.toString("US-ASCII").removeSuffix("\r")
            bytes.write(value)
        }
        error("HTTP header too long")
    }
}
