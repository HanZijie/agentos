package com.example.agenriod.agent

import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.InetAddress
import java.net.ServerSocket
import kotlin.concurrent.thread

internal class ModelToolFixture(private val answer: (JSONObject, Int) -> JSONObject) : AutoCloseable {
    private val socket = ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"))
    val url = "http://127.0.0.1:${socket.localPort}/v1"
    @Volatile var requests = 0
        private set
    @Volatile private var failure: Throwable? = null
    private val worker = thread(isDaemon = true) {
        while (!socket.isClosed) {
            val client = runCatching { socket.accept() }.getOrNull() ?: break
            client.use { connection -> runCatching {
                connection.soTimeout = 10000
                val input = connection.getInputStream()
                fun line(): String {
                    val bytes = ByteArrayOutputStream()
                    while (true) { val b = input.read(); check(b >= 0); if (b == 10) return bytes.toString("US-ASCII").trimEnd('\r'); bytes.write(b) }
                }
                line()
                var size = 0
                while (true) { val header = line(); if (header.isEmpty()) break; if (header.startsWith("Content-Length:", true)) size = header.substringAfter(':').trim().toInt() }
                val bytes = ByteArray(size)
                var offset = 0
                while (offset < size) { val n = input.read(bytes, offset, size - offset); check(n > 0); offset += n }
                val message = answer(JSONObject(String(bytes, Charsets.UTF_8)), ++requests)
                val response = JSONObject().put("choices", JSONArray().put(JSONObject().put("message", message).put("finish_reason", if (message.has("tool_calls")) "tool_calls" else "stop"))).toString().toByteArray()
                connection.getOutputStream().apply { write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${response.size}\r\nConnection: close\r\n\r\n".toByteArray()); write(response); flush() }
            }.onFailure { failure = it } }
        }
    }
    fun assertHealthy() { failure?.let { throw AssertionError("Model fixture failed", it) } }
    override fun close() { socket.close(); worker.join(1000) }
}
