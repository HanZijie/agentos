package com.example.agenriod.agent

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AgentTaskQueueTest {
    @Test fun processDeathRestoresQueuedTasksWithoutReplayingRunningWork() = runBlocking(Dispatchers.Main) {
        val file = File(InstrumentationRegistry.getInstrumentation().targetContext.cacheDir, "queue-${UUID.randomUUID()}.json")
        val firstScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        val entered = CompletableDeferred<Unit>()
        val first = AgentTaskQueue(file, firstScope, { entered.complete(Unit); awaitCancellation() }, {})
        first.enqueue(AgentTask(id = "in-flight", sessionId = "test", prompt = "write"))
        first.enqueue(AgentTask(id = "pending", sessionId = "test", prompt = "read"))
        entered.await()
        firstScope.cancel() // Simulate process death without a graceful queue.close().
        yield()
        val secondScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        val states = MutableStateFlow<List<TaskSummary>>(emptyList())
        val executions = mutableListOf<String>()
        val second = AgentTaskQueue(file, secondScope, { executions += it.prompt; Result.success(Unit) }, { states.value = it })
        try {
            withTimeout(5000) { states.first { list -> list.any { it.id == "pending" && it.status == "completed" } } }
            assertEquals(listOf("read"), executions)
            assertEquals("interrupted", states.value.first { it.id == "in-flight" }.status)
            second.retry("in-flight")
            withTimeout(5000) { states.first { list -> list.any { it.prompt == "write" && it.status == "completed" } } }
            assertEquals(listOf("read", "write"), executions)
        } finally { second.close(); secondScope.cancel(); file.delete() }
    }
    @Test fun failureAndCancellationDoNotDropFollowingTasks() = runBlocking(Dispatchers.Main) {
        val file = File(InstrumentationRegistry.getInstrumentation().targetContext.cacheDir, "queue-${UUID.randomUUID()}.json")
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main) // Dispatch allows all enqueues before processing.
        val states = MutableStateFlow<List<TaskSummary>>(emptyList())
        val calls = mutableListOf<String>()
        val queue = AgentTaskQueue(file, scope, { calls += it.id; if (it.id == "fail") error("Expected failure") else Result.success(Unit) }, { states.value = it })
        queue.enqueue(AgentTask(id = "fail", sessionId = "test", prompt = "first"))
        queue.enqueue(AgentTask(id = "cancel", sessionId = "test", prompt = "second"))
        queue.cancel("cancel")
        queue.enqueue(AgentTask(id = "done", sessionId = "test", prompt = "third"))
        try {
            withTimeout(5000) { states.first { list -> list.any { it.id == "done" && it.status == "completed" } } }
            assertEquals(listOf("fail", "done"), calls)
            assertEquals("failed", states.value.first { it.id == "fail" }.status)
            assertEquals("cancelled", states.value.first { it.id == "cancel" }.status)
        } finally { queue.close(); scope.cancel(); file.delete() }
    }
}
