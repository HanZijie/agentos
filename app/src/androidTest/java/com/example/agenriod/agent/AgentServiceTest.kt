package com.example.agenriod.agent

import android.app.ActivityManager
import android.content.*
import android.os.*
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.example.agenriod.MainActivity
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.net.ServerSocket
import java.net.InetAddress
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

@RunWith(AndroidJUnit4::class)
class AgentServiceTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext

    @Test(timeout = 60000)
    fun activityLifecycleAndProcessRestartPreserveTasks() {
        var scenario = ActivityScenario.launch(MainActivity::class.java)
        var connection = Connection()
        connection.connect()
        val original = connection.awaitState { true }
        val server = ServerSocket(0, 10, InetAddress.getByName("127.0.0.1"))
        val received = CountDownLatch(1)
        val release = CountDownLatch(1)
        val receivedAgain = CountDownLatch(1)
        var requestNumber = 0
        val serverThread = thread(isDaemon = true) {
            while (!server.isClosed) {
                val socket = runCatching { server.accept() }.getOrNull() ?: break
                val index = ++requestNumber
                thread(isDaemon = true) {
                    runCatching { socket.use {
                        val reader = it.getInputStream().bufferedReader()
                        var size = 0
                        while (true) { val header = reader.readLine() ?: break; if (header.isEmpty()) break; if (header.startsWith("Content-Length:", true)) size = header.substringAfter(':').trim().toInt() }
                        val body = CharArray(size); var read = 0
                        while (read < size) { val count = reader.read(body, read, size - read); if (count < 0) break; read += count }
                        if (index == 1) { received.countDown(); release.await(30, TimeUnit.SECONDS) }
                        if (index == 2) receivedAgain.countDown()
                        val response = """{"choices":[{"message":{"role":"assistant","content":"Host lifecycle verified"},"finish_reason":"stop"}]}"""
                        it.getOutputStream().write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${response.toByteArray().size}\r\nConnection: close\r\n\r\n$response".toByteArray())
                    } }
                }
            }
        }
        var session = ""
        try {
            connection.command("newSession")
            session = connection.awaitState { it.currentSession.id != original.currentSession.id }.currentSession.id
            connection.command("saveSettings", JSONObject().put("config", ModelConfig(baseUrl = "http://127.0.0.1:${server.localPort}/v1", apiKey = "", model = "local-lifecycle-test").toJson()).put("hooks", ""))
            val first = UUID.randomUUID().toString()
            val next = UUID.randomUUID().toString()
            connection.command("send", JSONObject().put("id", first).put("text", "Hold this request"))
            assertTrue("Model request did not start", received.await(10, TimeUnit.SECONDS))
            val manager = context.getSystemService(ActivityManager::class.java)
            val pid = manager.runningAppProcesses.first { it.processName == context.packageName + ":agent" }.pid
            assertNotEquals(Process.myPid(), pid)
            scenario.recreate()
            scenario.close() // Activity is destroyed; started FGS remains.
            assertTrue(connection.remote.asBinder().pingBinder())
            connection.command("send", JSONObject().put("id", next).put("text", "Resume the queued request"))
            connection.awaitState { it.tasks.any { task -> task.id == next && task.status == "queued" } }
            connection.close()
            Process.killProcess(pid)
            release.countDown()
            // A visible client reconnects to the same service after its independent process died.
            scenario = ActivityScenario.launch(MainActivity::class.java)
            connection = Connection().also { it.connect() }
            val recovered = connection.awaitState(20000) { state -> state.tasks.any { it.id == next && it.status == "completed" } }
            assertTrue(receivedAgain.await(5, TimeUnit.SECONDS))
            assertEquals("interrupted", recovered.tasks.first { it.id == first }.status)
            assertEquals(2, requestNumber)
            assertTrue(recovered.messages.any { it.text == "Host lifecycle verified" })
            val newPid = manager.runningAppProcesses.first { it.processName == context.packageName + ":agent" }.pid
            assertNotEquals(pid, newPid)
        } finally {
            release.countDown(); server.close(); serverThread.join(1000)
            runCatching { connection.command("abort"); if (session.isNotEmpty()) connection.command("deleteSession", JSONObject().put("id", session)) }
            runCatching { connection.command("saveSettings", JSONObject().put("config", original.config.toJson()).put("hooks", original.hooks)); connection.command("switchSession", JSONObject().put("id", original.currentSession.id)) }
            connection.close(); scenario.close()
        }
    }

    @Test(timeout = 45000)
    fun agentExecutesMcpToolFromBackgroundPlugin() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        val connection = Connection().also { it.connect() }
        val original = connection.awaitState { true }
        var session = ""
        ModelToolFixture { request, index ->
            if (index == 1) {
                val tools = request.getJSONArray("tools")
                val name = (0 until tools.length()).map { tools.getJSONObject(it).getJSONObject("function").getString("name") }
                    .first { it.contains("mcp_notes_notes_stats") }
                JSONObject().put("role", "assistant").put("content", JSONObject.NULL).put("tool_calls", org.json.JSONArray().put(
                    JSONObject().put("id", "mcp-call").put("type", "function").put("function", JSONObject().put("name", name).put("arguments", "{}"))))
            } else {
                val messages = request.getJSONArray("messages")
                assertTrue("Model must receive MCP tool output", (0 until messages.length()).map { messages.getJSONObject(it) }.any { it.optString("role") == "tool" && it.optString("content").contains("noteCount") })
                JSONObject().put("role", "assistant").put("content", "MCP pipeline verified")
            }
        }.use { server ->
            try {
                PluginBrokerTestClient.shell("am start -W -n com.example.agenriod.notes/.MainActivity")
                PluginBrokerTestClient.shell("am start -W -n com.example.agenriod/.MainActivity")
                connection.awaitState { it.plugins.any { plugin -> plugin.id == "notes" && plugin.toolCount == 3 } }
                connection.command("newSession")
                session = connection.awaitState { it.currentSession.id != original.currentSession.id }.currentSession.id
                connection.command("saveSettings", JSONObject().put("config", ModelConfig(baseUrl = server.url, apiKey = "", model = "local-mcp-test").toJson()).put("hooks", ""))
                val id = UUID.randomUUID().toString()
                connection.command("send", JSONObject().put("id", id).put("text", "Count notes through MCP"))
                val final = connection.awaitState(20000) { it.tasks.any { task -> task.id == id && task.status in listOf("completed", "failed") } }
                server.assertHealthy()
                assertEquals("completed", final.tasks.first { it.id == id }.status)
                assertTrue(final.messages.any { it.role == "tool" && it.text.contains("noteCount") && !it.isError })
                assertTrue(final.messages.any { it.text == "MCP pipeline verified" })
                assertEquals(2, server.requests)
            } finally {
                runCatching { connection.command("abort"); if (session.isNotEmpty()) connection.command("deleteSession", JSONObject().put("id", session)) }
                runCatching { connection.command("saveSettings", JSONObject().put("config", original.config.toJson()).put("hooks", original.hooks)); connection.command("switchSession", JSONObject().put("id", original.currentSession.id)) }
                PluginBrokerTestClient.shell("am force-stop com.example.agenriod.notes")
                connection.close(); scenario.close()
            }
        }
    }

    private inner class Connection : ServiceConnection {
        lateinit var remote: IAgentService
        private val connected = CountDownLatch(1)
        private val state = AtomicReference<AgentHostState?>()
        private var revision = -1L
        private val callback = object : IAgentServiceCallback.Stub() {
            @Synchronized override fun onStateChanged(sequence: Long, snapshot: ParcelFileDescriptor) {
                val incoming = stateFromJson(JsonParcel.read(snapshot))
                if (sequence > revision) { revision = sequence; state.set(incoming) }
            }
        }
        fun connect() {
            assertTrue(context.bindService(Intent(context, AgentService::class.java), this, Context.BIND_AUTO_CREATE))
            assertTrue(connected.await(10, TimeUnit.SECONDS))
            remote.registerCallback(callback)
        }
        override fun onServiceConnected(name: ComponentName, service: IBinder) { remote = IAgentService.Stub.asInterface(service); connected.countDown() }
        override fun onServiceDisconnected(name: ComponentName) { }
        fun command(name: String, json: JSONObject = JSONObject()) {
            val response = JsonParcel.write(context, json.toString()).use { JSONObject(remote.command(name, it)) }
            assertTrue(response.optString("error"), response.getBoolean("ok"))
        }
        fun awaitState(timeout: Long = 10000, predicate: (AgentHostState) -> Boolean): AgentHostState {
            val deadline = SystemClock.elapsedRealtime() + timeout
            while (SystemClock.elapsedRealtime() < deadline) {
                val value = state.get()
                if (value != null && predicate(value)) return value
                Thread.sleep(30)
            }
            error("Timed out waiting for host state: ${state.get()?.status}; tasks=${state.get()?.tasks}")
        }
        fun close() { runCatching { remote.unregisterCallback(callback) }; runCatching { context.unbindService(this) } }
    }
}
