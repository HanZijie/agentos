package com.example.agentos.demo.records

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

/** Minimal loopback-only Streamable HTTP MCP server for the demo Plugin. */
internal class RecordsMcpServer(private val repository: RecordsRepository) : AutoCloseable {
    private val server = ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"))
    private val sessions = ConcurrentHashMap<String, Boolean>()
    private val workers = Executors.newFixedThreadPool(2)

    val configuration: JSONObject
        get() = JSONObject()
            .put("id", "records")
            .put("transport", "streamable-http")
            .put("url", "http://127.0.0.1:${server.localPort}/mcp")

    init {
        thread(name = "records-mcp-listener", isDaemon = true) {
            while (!server.isClosed) {
                val socket = runCatching { server.accept() }.getOrNull() ?: break
                workers.execute { runCatching { socket.use { handle(it) } } }
            }
        }
    }

    override fun close() {
        server.close()
        workers.shutdownNow()
        sessions.clear()
    }

    private fun handle(socket: Socket) {
        socket.soTimeout = 10000
        val input = socket.getInputStream()
        val request = line(input)?.split(' ') ?: return
        if (request.size < 3 || request[1] != "/mcp") {
            respond(socket, 404)
            return
        }
        val headers = mutableMapOf<String, String>()
        while (true) {
            val header = line(input) ?: return
            if (header.isEmpty()) break
            val separator = header.indexOf(':')
            if (separator <= 0 || headers.size >= 64) {
                respond(socket, 400)
                return
            }
            headers[header.substring(0, separator).lowercase()] = header.substring(separator + 1).trim()
        }
        process(socket, request[0], headers, input)
    }

    private fun process(socket: Socket, method: String, headers: Map<String, String>, input: InputStream) {
        // The endpoint is process-local and rejects browser-style cross-origin
        // requests. No credential is placed in the Plugin descriptor.
        if (headers.containsKey("origin")) {
            respond(socket, 403)
            return
        }
        val sessionId = headers["mcp-session-id"]
        if (method == "GET") {
            respond(socket, 405)
            return
        }
        if (method == "DELETE") {
            if (sessionId == null || sessions.remove(sessionId) == null) respond(socket, 404) else respond(socket, 200)
            return
        }
        if (method != "POST") {
            respond(socket, 405)
            return
        }
        val size = headers["content-length"]?.toIntOrNull()
        if (size == null || size !in 1..(1024 * 1024) || headers.containsKey("transfer-encoding")) {
            respond(socket, 400)
            return
        }
        val body = ByteArray(size)
        var offset = 0
        while (offset < size) {
            val count = input.read(body, offset, size - offset)
            if (count < 0) return
            offset += count
        }
        val message = runCatching { JSONObject(String(body, Charsets.UTF_8)) }.getOrNull()
        if (message == null || message.optString("jsonrpc") != "2.0") {
            respond(socket, 400)
            return
        }
        when (message.optString("method")) {
            "initialize" -> initialize(socket, message)
            "notifications/initialized" -> {
                if (sessionId == null || !sessions.containsKey(sessionId)) respond(socket, 404)
                else {
                    sessions[sessionId] = true
                    respond(socket, 202)
                }
            }
            else -> dispatch(socket, message, sessionId, headers)
        }
    }

    private fun initialize(socket: Socket, request: JSONObject) {
        if (sessions.size >= 64) {
            respond(socket, 503)
            return
        }
        val id = UUID.randomUUID().toString()
        sessions[id] = false
        val result = JSONObject()
            .put("protocolVersion", "2025-11-25")
            .put("capabilities", JSONObject().put("tools", JSONObject()))
            .put("serverInfo", JSONObject().put("name", "meeting-records-mcp").put("version", "0.1.0"))
        respond(socket, 200, result(request, result), id)
    }

    private fun dispatch(socket: Socket, message: JSONObject, sessionId: String?, headers: Map<String, String>) {
        if (sessionId == null || sessions[sessionId] != true) {
            respond(socket, 400)
            return
        }
        if (headers["mcp-protocol-version"] != "2025-11-25") {
            respond(socket, 400)
            return
        }
        if (!message.has("id")) {
            respond(socket, 202)
            return
        }
        when (message.optString("method")) {
            "ping" -> respond(socket, 200, result(message, JSONObject()))
            "tools/list" -> respond(socket, 200, result(message, JSONObject().put("tools", toolDefinitions())))
            "tools/call" -> {
                val params = message.optJSONObject("params")
                val name = params?.optString("name")
                val args = params?.optJSONObject("arguments") ?: JSONObject()
                val output = runCatching { invokeTool(name.orEmpty(), args) }
                    .fold(
                        onSuccess = { value -> JSONObject().put("content", JSONArray().put(JSONObject().put("type", "text").put("text", value.toString()))).put("structuredContent", value).put("isError", false) },
                        onFailure = { failure -> JSONObject().put("content", JSONArray().put(JSONObject().put("type", "text").put("text", failure.message ?: "Tool failed"))).put("isError", true) },
                    )
                respond(socket, 200, result(message, output))
            }
            else -> respond(socket, 200, JSONObject().put("jsonrpc", "2.0").put("id", message.get("id")).put("error", JSONObject().put("code", -32601).put("message", "Method not found")))
        }
    }

    private fun invokeTool(name: String, args: JSONObject): JSONObject = when (name) {
        "records.create" -> {
            val record = repository.create(required(args, "title"), required(args, "body"), args.optString("meetingTime"))
            JSONObject().put("ok", true).put("record", record.toJson())
        }
        "records.list" -> JSONObject().put("records", JSONArray().apply { repository.list(args.optString("query")).forEach { put(it.toJson()) } })
        "records.get" -> JSONObject().put("record", repository.get(required(args, "id"))?.toJson() ?: JSONObject.NULL)
        "records.update" -> {
            val record = repository.update(required(args, "id"), required(args, "title"), required(args, "body"), args.optString("meetingTime"))
            JSONObject().put("ok", true).put("record", record.toJson())
        }
        "records.delete" -> JSONObject().put("ok", repository.delete(required(args, "id")))
        else -> error("Unknown records tool: $name")
    }

    private fun required(args: JSONObject, name: String): String = args.optString(name).trim().also {
        require(it.isNotBlank()) { "$name is required" }
    }

    private fun toolDefinitions(): JSONArray {
        // Native AgentOS descriptors use `parameters`; MCP tools use the
        // protocol name `inputSchema`. Keep the two public surfaces explicit.
        val native = RecordsPluginEndpoint.descriptor(configuration).getJSONArray("tools")
        return JSONArray().apply {
            for (index in 0 until native.length()) {
                val tool = JSONObject(native.getJSONObject(index).toString())
                tool.put("inputSchema", tool.optJSONObject("parameters") ?: JSONObject().put("type", "object"))
                tool.remove("parameters")
                put(tool)
            }
        }
    }

    private fun result(request: JSONObject, value: JSONObject): JSONObject = JSONObject()
        .put("jsonrpc", "2.0")
        .put("id", request.get("id"))
        .put("result", value)

    private fun respond(socket: Socket, code: Int, body: JSONObject? = null, sessionId: String? = null) {
        val bytes = body?.toString()?.toByteArray(Charsets.UTF_8) ?: ByteArray(0)
        val phrase = when (code) {
            200 -> "OK"
            202 -> "Accepted"
            400 -> "Bad Request"
            403 -> "Forbidden"
            404 -> "Not Found"
            405 -> "Method Not Allowed"
            503 -> "Service Unavailable"
            else -> "Response"
        }
        val header = "HTTP/1.1 $code $phrase\r\nContent-Type: application/json\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n" +
            (sessionId?.let { "Mcp-Session-Id: $it\r\n" } ?: "") + "\r\n"
        socket.getOutputStream().apply {
            write(header.toByteArray(Charsets.US_ASCII))
            write(bytes)
            flush()
        }
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
