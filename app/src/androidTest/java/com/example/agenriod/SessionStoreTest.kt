package com.example.agenriod

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.example.agenriod.agent.ChatMessage
import com.example.agenriod.agent.SessionStore
import com.example.agenriod.agent.ModelConfig
import com.example.agenriod.agent.NativeAgentBridge
import com.example.agenriod.agent.PiRuntime
import com.example.agenriod.agent.SkillCatalog
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.cancelAndJoin
import org.json.JSONArray
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.UUID
import java.net.ServerSocket
import java.net.InetAddress

@RunWith(AndroidJUnit4::class)
class SessionStoreTest {
    @Test(timeout = 15000)
    fun switchingAfterAbortDoesNotWaitForStalledModelResponse() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val server = ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"))
        val received = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        val serverJob = launch(Dispatchers.IO) {
            server.accept().use { socket ->
                val reader = socket.getInputStream().bufferedReader()
                while (!reader.readLine().isNullOrEmpty()) { /* headers */ }
                received.complete(Unit)
                release.await()
            }
        }
        val config = ModelConfig(baseUrl = "http://127.0.0.1:${server.localPort}/v1", apiKey = "")
        val runtime = PiRuntime(context, NativeAgentBridge(context, { config }, { "" }, {}))
        runtime.start(config, sessionId = "session-a").getOrThrow()
        val request = launch(Dispatchers.Default) { runtime.prompt("A local cancellation test") }
        try {
            withTimeout(5000) { received.await() }
            runtime.abort()
            withTimeout(5000) {
                runtime.close()
                request.join()
                runtime.start(config, sessionId = "session-b").getOrThrow()
            }
            assertEquals(0, JSONArray(runtime.historyJson()).length())
        } finally {
            release.complete(Unit)
            server.close()
            runtime.abort()
            request.cancelAndJoin()
            serverJob.cancelAndJoin()
            runtime.close()
        }
    }

    @Test
    fun reopeningSessionRestoresTheRealPiTranscript() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val config = ModelConfig(apiKey = "")
        val bridge = NativeAgentBridge(context, { config }, { "" }, {})
        val runtime = PiRuntime(context, bridge)
        val message = """{"role":"user","content":[{"type":"text","text":"Remember session A"}],"timestamp":1}"""
        try {
            runtime.start(config, listOf(message), "session-a").getOrThrow()
            assertEquals("Remember session A", JSONArray(runtime.historyJson()).getJSONObject(0).getJSONArray("content").getJSONObject(0).getString("text"))
            runtime.close()
            runtime.start(config, emptyList(), "session-b").getOrThrow()
            assertEquals(0, JSONArray(runtime.historyJson()).length())
            runtime.close()
            runtime.start(config, listOf(message), "session-a").getOrThrow()
            assertEquals(1, JSONArray(runtime.historyJson()).length())
        } finally {
            runtime.close()
        }
    }

    @Test
    fun slashSkillsAreLoadedFromBundledSkillFiles() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val skills = SkillCatalog(context).load()
        assertTrue(skills.any { it.name == "review" && it.instruction.contains("Inspect") })
        assertTrue(skills.any { it.name == "explain" })
    }

    @Test
    fun sessionsKeepSeparatePiHistoryAcrossStoreRecreation() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.cacheDir, "session-test-${UUID.randomUUID()}")
        try {
            val store = SessionStore(context, directory)
            val first = store.create().let { it.copy(
                summary = it.summary.copy(title = "Review task"),
                rawMessages = listOf("""{"role":"user","content":[{"type":"text","text":"Review the files"}],"timestamp":1}"""),
                uiMessages = listOf(ChatMessage("first", "user", "/review the files")),
            ) }
            val second = store.create()
            store.save(first)
            store.save(second)
            val restored = SessionStore(context, directory)
            assertEquals(first, restored.read(first.summary.id))
            assertTrue(restored.read(second.summary.id).rawMessages.isEmpty())
            assertEquals(2, restored.list().size)
            restored.delete(first.summary.id)
            assertEquals(listOf(second.summary.id), restored.list().map { it.id })
        } finally {
            directory.deleteRecursively()
        }
    }
}
