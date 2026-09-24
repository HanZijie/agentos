package com.example.agentos.demo.alarm

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

internal data class AlarmItem(
    val id: String,
    val label: String,
    val triggerAt: Long,
    val enabled: Boolean,
    val updatedAt: Long,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("label", label)
        .put("triggerAt", triggerAt)
        .put("enabled", enabled)
        .put("updatedAt", updatedAt)

    companion object {
        fun fromJson(value: JSONObject): AlarmItem = AlarmItem(
            id = value.optString("id"),
            label = value.optString("label"),
            triggerAt = value.optLong("triggerAt"),
            enabled = value.optBoolean("enabled", true),
            updatedAt = value.optLong("updatedAt"),
        )
    }
}

internal class AlarmRepository(context: Context) {
    private val file = AtomicFile(File(context.filesDir, "alarms.json"))

    fun list(): List<AlarmItem> = synchronized(LOCK) { read().sortedBy { it.triggerAt } }

    fun create(label: String, triggerAt: Long): AlarmItem = synchronized(LOCK) {
        val item = AlarmItem(UUID.randomUUID().toString(), label.trim().ifBlank { "提醒" }, triggerAt, true, System.currentTimeMillis())
        write(read() + item)
        item
    }

    fun setEnabled(id: String, enabled: Boolean): AlarmItem = synchronized(LOCK) {
        val records = read()
        val index = records.indexOfFirst { it.id == id }
        require(index >= 0) { "Alarm not found: $id" }
        val previous = records[index]
        val item = previous.copy(enabled = enabled, updatedAt = System.currentTimeMillis())
        write(records.toMutableList().also { it[index] = item })
        item
    }

    fun delete(id: String): Boolean = synchronized(LOCK) {
        val records = read()
        val kept = records.filterNot { it.id == id }
        if (kept.size == records.size) return@synchronized false
        write(kept)
        true
    }

    private fun read(): List<AlarmItem> = runCatching {
        val input = JSONArray(file.readFully().toString(Charsets.UTF_8))
        buildList {
            for (index in 0 until input.length()) {
                val item = input.optJSONObject(index) ?: continue
                if (item.optString("id").isNotBlank()) add(AlarmItem.fromJson(item))
            }
        }
    }.getOrDefault(emptyList())

    private fun write(items: List<AlarmItem>) {
        val output = JSONArray()
        items.forEach { output.put(it.toJson()) }
        val stream = file.startWrite()
        try { stream.write(output.toString().toByteArray()); file.finishWrite(stream) }
        catch (error: Throwable) { file.failWrite(stream); throw error }
    }

    companion object { private val LOCK = Any() }
}
