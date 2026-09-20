package com.example.agenriod.agent

import android.util.AtomicFile
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

/** Single-owner, durable FIFO. Interrupted work is never silently replayed. */
internal data class AgentTask(
    val id: String = UUID.randomUUID().toString(),
    val sessionId: String,
    val prompt: String,
    val displayPrompt: String = prompt,
    val images: List<ImageAttachment> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val status: String = "queued",
    val error: String = "",
) {
    fun summary() = TaskSummary(id, sessionId, displayPrompt, status, error)
}

internal class AgentTaskQueue(
    file: File,
    scope: CoroutineScope,
    private val execute: suspend (AgentTask) -> Result<Unit>,
    private val onChanged: (List<TaskSummary>) -> Unit,
) {
    private val journal = AtomicFile(file.also { it.parentFile?.mkdirs() })
    private val tasks = load().map { if (it.status == "running") it.copy(status = "interrupted", error = "Service stopped during execution. Retry may repeat completed tools.") else it }.toMutableList()
    private val wake = Channel<Unit>(Channel.CONFLATED)
    private val worker = scope.launch {
        for (ignored in wake) {
            while (true) {
                val task = tasks.firstOrNull { it.status == "queued" } ?: break
                replace(task.copy(status = "running")) // Commit before executing any side effect.
                val result = try { execute(task) } catch (cancelled: CancellationException) { throw cancelled }
                    catch (failure: Exception) { Result.failure(failure) }
                if (tasks.firstOrNull { it.id == task.id }?.status == "running") {
                    replace(task.copy(status = if (result.isSuccess) "completed" else "failed", error = result.exceptionOrNull()?.message.orEmpty()))
                }
            }
        }
    }

    init { publish(); wake.trySend(Unit) }

    fun enqueue(task: AgentTask) {
        require(task.prompt.isNotBlank()) { "Prompt is empty" }
        require(tasks.count { it.status == "queued" || it.status == "running" } < 32) { "Task queue is full" }
        if (tasks.any { it.id == task.id }) return
        tasks += task
        publish()
        wake.trySend(Unit)
    }
    fun activeId(): String? = tasks.firstOrNull { it.status == "running" }?.id
    fun pendingCount() = tasks.count { it.status == "queued" || it.status == "running" }
    fun cancel(id: String) {
        tasks.firstOrNull { it.id == id && it.status in listOf("queued", "running", "interrupted") }?.let { replace(it.copy(status = "cancelled")) }
    }
    fun cancelSession(id: String) { tasks.filter { it.sessionId == id }.forEach { cancel(it.id) } }
    fun retry(id: String) {
        val original = tasks.firstOrNull { it.id == id && it.status in listOf("interrupted", "failed") } ?: return
        replace(original.copy(status = "cancelled"))
        enqueue(original.copy(id = UUID.randomUUID().toString(), status = "queued", error = ""))
    }
    fun close() {
        activeId()?.let { id -> tasks.first { it.id == id }.let { replace(it.copy(status = "interrupted", error = "Service stopped during execution")) } }
        worker.cancel()
        wake.close()
    }
    private fun replace(task: AgentTask) { tasks[tasks.indexOfFirst { it.id == task.id }] = task; publish() }
    private fun publish() {
        // Keep terminal metadata bounded, but never evict outstanding work.
        val terminal = tasks.filter { it.status in listOf("completed", "cancelled") }.dropLast(30).map { it.id }.toSet()
        tasks.removeAll { it.id in terminal }
        val stream = journal.startWrite()
        try {
            stream.write(JSONArray().apply { tasks.forEach { put(it.json()) } }.toString().toByteArray())
            journal.finishWrite(stream)
        } catch (failure: Exception) { journal.failWrite(stream); throw failure }
        onChanged(tasks.map { it.summary() })
    }
    private fun load(): List<AgentTask> {
        if (!journal.baseFile.exists() && !File(journal.baseFile.path + ".bak").exists()) return emptyList()
        val array = JSONArray(journal.openRead().bufferedReader().use { it.readText() })
        return (0 until array.length()).map { array.getJSONObject(it).task() }
    }
}

private fun AgentTask.json() = JSONObject().apply {
    put("id", id); put("sessionId", sessionId); put("prompt", prompt); put("displayPrompt", displayPrompt)
    put("createdAt", createdAt); put("status", status); put("error", error)
    put("images", JSONArray().apply { images.forEach { put(JSONObject().put("base64", it.base64).put("mimeType", it.mimeType)) } })
}
private fun JSONObject.task() = AgentTask(
    id = getString("id"), sessionId = getString("sessionId"), prompt = getString("prompt"), displayPrompt = optString("displayPrompt", getString("prompt")),
    images = optJSONArray("images").let { a -> (0 until (a?.length() ?: 0)).map { a!!.getJSONObject(it).let { j -> ImageAttachment(j.getString("base64"), j.getString("mimeType")) } } },
    createdAt = getLong("createdAt"), status = optString("status", "queued"), error = optString("error"),
)
