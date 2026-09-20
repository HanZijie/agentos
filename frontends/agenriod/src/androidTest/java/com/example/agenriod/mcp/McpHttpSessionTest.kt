package com.example.agenriod.mcp

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.ByteArrayOutputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

@RunWith(AndroidJUnit4::class)
class McpHttpSessionTest {
    @Test(timeout = 15000)
    fun negotiatesSessionPaginatesJsonAndSseAndPreservesToolErrors() {
        Fixture().use { server ->
            server.list = { request ->
                if (!request.json.getJSONObject("params").has("cursor")) Response(result(request, JSONObject().put("tools", JSONArray().put(tool("first"))).put("nextCursor", "second-page")))
                else Response(result(request, JSONObject().put("tools", JSONArray().put(tool("second")))), sse = true)
            }
            server.call = { request -> Response(result(request, JSONObject().put("content", JSONArray().put(JSONObject().put("type", "text").put("text", "中文错误"))).put("isError", true).put("structuredContent", JSONObject().put("reason", "expected"))), sse = true) }
            val client = McpHttpSession(server.config())
            try {
                assertEquals(listOf("first", "second"), client.listTools().map { it.getString("name") })
                val result = client.callTool("first", JSONObject().put("text", "中文"))
                assertTrue(result.getBoolean("isError"))
                assertEquals("中文错误", result.getJSONArray("content").getJSONObject(0).getString("text"))
                assertEquals("expected", result.getJSONObject("structuredContent").getString("reason"))
                assertTrue(client.toolsChanged)
            } finally { client.close() }
            assertTrue(server.requests.any { it.method == "DELETE" })
            val posts = server.requests.filter { it.method == "POST" }
            assertEquals("initialize", posts.first().json.getString("method"))
            assertEquals("notifications/initialized", posts[1].json.getString("method"))
            assertTrue(posts.all { it.headers["accept"]?.contains("text/event-stream") == true })
            assertTrue(posts.all { it.headers["authorization"] == "Bearer test-only" })
            assertTrue(posts.drop(1).all { it.headers["mcp-session-id"] == "fixture-session" && it.headers["mcp-protocol-version"] == McpHttpSession.PROTOCOL })
            assertTrue(runCatching { client.callTool("first", JSONObject()) }.isFailure)
            server.assertHealthy()
        }
    }
    @Test(timeout = 15000)
    fun expiredSessionNeverReplaysAToolCall() {
        Fixture().use { server ->
            val calls = AtomicInteger()
            server.call = { calls.incrementAndGet(); Response(status = 404) }
            McpHttpSession(server.config()).use { client ->
                client.listTools()
                val failure = runCatching { client.callTool("first", JSONObject()) }.exceptionOrNull()
                assertTrue(failure?.message.orEmpty().contains("not replayed"))
                assertEquals(1, calls.get())
                client.listTools() // Explicit subsequent operation can establish a new session.
                assertEquals(2, server.requests.count { it.json.optString("method") == "initialize" })
                assertEquals(1, calls.get())
            }
        }
    }
    @Test(timeout = 15000)
    fun closeInterruptsAnInFlightResponse() {
        Fixture().use { server ->
            val entered = CountDownLatch(1)
            val release = CountDownLatch(1)
            server.call = { request -> entered.countDown(); release.await(8, TimeUnit.SECONDS); Response(result(request, JSONObject().put("content", JSONArray()))) }
            val client = McpHttpSession(server.config())
            client.listTools()
            val finished = CountDownLatch(1)
            val failures = AtomicInteger()
            val worker = thread { try { if (runCatching { client.callTool("first", JSONObject()) }.isFailure) failures.incrementAndGet() } finally { finished.countDown() } }
            try {
                assertTrue(entered.await(3, TimeUnit.SECONDS))
                client.close()
                assertTrue("MCP call remained blocked after owner disconnect", finished.await(3, TimeUnit.SECONDS))
                assertEquals(1, failures.get())
            } finally { release.countDown(); worker.join(2000); client.close() }
        }
    }
    @Test(timeout = 15000)
    fun rejectsMismatchedIdsAndDoesNotExposeServerErrorText() {
        Fixture().use { server ->
            server.call = { Response(JSONObject().put("jsonrpc", "2.0").put("id", -1).put("result", JSONObject())) }
            McpHttpSession(server.config()).use { client ->
                client.listTools()
                assertTrue(runCatching { client.callTool("first", JSONObject()) }.exceptionOrNull()?.message.orEmpty().contains("id"))
            }
            server.call = { request -> Response(JSONObject().put("jsonrpc", "2.0").put("id", request.json.get("id")).put("error", JSONObject().put("code", -32602).put("message", "secret-token-should-not-leak"))) }
            McpHttpSession(server.config()).use { client ->
                val message = runCatching { client.callTool("first", JSONObject()) }.exceptionOrNull()?.message.orEmpty()
                assertTrue(message.contains("-32602")); assertFalse(message.contains("secret-token"))
            }
        }
        assertTrue(runCatching { McpHttpSession(JSONObject().put("url", "http://example.com/mcp")) }.isFailure)
        assertTrue(runCatching { McpHttpSession(JSONObject().put("url", "https://example.com/mcp").put("headers", JSONObject().put("Mcp-Session-Id", "forged"))) }.isFailure)
    }

    private data class Request(val method: String, val headers: Map<String, String>, val json: JSONObject)
    private data class Response(val json: JSONObject? = null, val status: Int = 200, val sse: Boolean = false, val session: Boolean = false)
    private class Fixture : AutoCloseable {
        private val socket = ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"))
        val requests = CopyOnWriteArrayList<Request>()
        private val errors = CopyOnWriteArrayList<Throwable>()
        @Volatile var list: (Request) -> Response = { Response(result(it, JSONObject().put("tools", JSONArray().put(tool("first"))))) }
        @Volatile var call: (Request) -> Response = { Response(result(it, JSONObject().put("content", JSONArray()))) }
        private val listener = thread(isDaemon = true) {
            while (!socket.isClosed) {
                val client = runCatching { socket.accept() }.getOrNull() ?: break
                thread(isDaemon = true) { client.use { runCatching { serve(it) }.onFailure { failure -> if (failure !is java.io.IOException) errors += failure } } }
            }
        }
        fun config(): JSONObject = JSONObject().put("url", "http://127.0.0.1:${socket.localPort}/mcp").put("headers", JSONObject().put("Authorization", "Bearer test-only"))
        private fun serve(client: Socket) {
            client.soTimeout = 10000
            val input = client.getInputStream()
            fun line(): String {
                val bytes = ByteArrayOutputStream()
                while (bytes.size() < 16384) { val c = input.read(); if (c < 0) error("EOF"); if (c == 10) return bytes.toString("US-ASCII").trimEnd('\r'); bytes.write(c) }
                error("Header too long")
            }
            val method = line().substringBefore(' ')
            val headers = mutableMapOf<String, String>()
            while (true) { val line = line(); if (line.isEmpty()) break; headers[line.substringBefore(':').lowercase()] = line.substringAfter(':').trim() }
            val bytes = ByteArray(headers["content-length"]?.toInt() ?: 0)
            var offset = 0
            while (offset < bytes.size) { val n = input.read(bytes, offset, bytes.size - offset); if (n < 0) error("EOF"); offset += n }
            val request = Request(method, headers, if (bytes.isEmpty()) JSONObject() else JSONObject(String(bytes, Charsets.UTF_8)))
            requests += request
            val response = when {
                method == "DELETE" -> Response()
                request.json.has("result") || request.json.has("error") -> Response(status = 202)
                request.json.optString("method") == "initialize" -> Response(result(request, JSONObject().put("protocolVersion", McpHttpSession.PROTOCOL).put("capabilities", JSONObject().put("tools", JSONObject())).put("serverInfo", JSONObject().put("name", "fixture").put("version", "1"))), session = true)
                request.json.optString("method") == "notifications/initialized" -> Response(status = 202)
                request.json.optString("method") == "tools/list" -> list(request)
                request.json.optString("method") == "tools/call" -> call(request)
                else -> error("Unexpected MCP request: ${request.json}")
            }
            val body = if (response.sse) "event: message\ndata: {\"jsonrpc\":\"2.0\",\"method\":\"notifications/tools/list_changed\"}\n\ndata: ${response.json}\n\n" else response.json?.toString().orEmpty()
            val data = body.toByteArray(Charsets.UTF_8)
            val head = "HTTP/1.1 ${response.status} Response\r\nContent-Type: ${if (response.sse) "text/event-stream" else "application/json"}\r\nContent-Length: ${data.size}\r\nConnection: close\r\n" + (if (response.session) "Mcp-Session-Id: fixture-session\r\n" else "") + "\r\n"
            client.getOutputStream().apply { write(head.toByteArray()); write(data); flush() }
        }
        fun assertHealthy() { assertTrue(errors.toString(), errors.isEmpty()) }
        override fun close() { socket.close(); listener.join(1000) }
    }
    companion object {
        private fun result(request: Request, value: JSONObject) = JSONObject().put("jsonrpc", "2.0").put("id", request.json.get("id")).put("result", value)
        private fun tool(name: String) = JSONObject().put("name", name).put("inputSchema", JSONObject().put("type", "object").put("properties", JSONObject()))
    }
}
