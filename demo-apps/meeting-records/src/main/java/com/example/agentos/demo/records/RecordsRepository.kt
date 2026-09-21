package com.example.agentos.demo.records

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

internal data class MeetingRecord(
    val id: String,
    val title: String,
    val body: String,
    val meetingTime: String,
    val updatedAt: Long,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("title", title)
        .put("body", body)
        .put("meetingTime", meetingTime)
        .put("updatedAt", updatedAt)

    companion object {
        fun fromJson(value: JSONObject): MeetingRecord = MeetingRecord(
            id = value.optString("id"),
            title = value.optString("title"),
            body = value.optString("body"),
            meetingTime = value.optString("meetingTime"),
            updatedAt = value.optLong("updatedAt"),
        )
    }
}

/** Small file-backed store so the demo works without a database dependency. */
internal class RecordsRepository(context: Context) {
    private val file = File(context.filesDir, "meeting-records.json")

    fun list(query: String = ""): List<MeetingRecord> = synchronized(LOCK) {
        val normalized = query.trim().lowercase()
        read()
            .filter { normalized.isBlank() || it.toJson().toString().lowercase().contains(normalized) }
            .sortedByDescending { it.updatedAt }
    }

    fun get(id: String): MeetingRecord? = synchronized(LOCK) {
        read().firstOrNull { it.id == id }
    }

    fun create(title: String, body: String, meetingTime: String): MeetingRecord = synchronized(LOCK) {
        val record = MeetingRecord(
            id = UUID.randomUUID().toString(),
            title = title.trim(),
            body = body.trim(),
            meetingTime = meetingTime.trim(),
            updatedAt = System.currentTimeMillis(),
        )
        write(read() + record)
        record
    }

    fun update(id: String, title: String, body: String, meetingTime: String): MeetingRecord = synchronized(LOCK) {
        val records = read()
        val index = records.indexOfFirst { it.id == id }
        require(index >= 0) { "Record not found: $id" }
        val record = MeetingRecord(
            id = id,
            title = title.trim(),
            body = body.trim(),
            meetingTime = meetingTime.trim(),
            updatedAt = System.currentTimeMillis(),
        )
        write(records.toMutableList().also { it[index] = record })
        record
    }

    fun delete(id: String): Boolean = synchronized(LOCK) {
        val records = read()
        val kept = records.filterNot { it.id == id }
        if (kept.size == records.size) return@synchronized false
        write(kept)
        true
    }

    private fun read(): List<MeetingRecord> = runCatching {
        val input = JSONArray(file.readText())
        buildList {
            for (index in 0 until input.length()) {
                val item = input.optJSONObject(index) ?: continue
                if (item.optString("id").isNotBlank()) add(MeetingRecord.fromJson(item))
            }
        }
    }.getOrDefault(emptyList())

    private fun write(records: List<MeetingRecord>) {
        val output = JSONArray()
        records.forEach { output.put(it.toJson()) }
        file.writeText(output.toString())
    }

    companion object {
        private val LOCK = Any()
    }
}
