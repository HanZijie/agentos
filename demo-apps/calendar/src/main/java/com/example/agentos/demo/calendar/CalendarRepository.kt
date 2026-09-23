package com.example.agentos.demo.calendar

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

internal data class CalendarEntry(
    val id: String,
    val title: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val location: String,
    val notes: String,
    val updatedAt: Long,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("title", title)
        .put("date", date)
        .put("startTime", startTime)
        .put("endTime", endTime)
        .put("location", location)
        .put("notes", notes)
        .put("updatedAt", updatedAt)

    companion object {
        fun fromJson(value: JSONObject): CalendarEntry = CalendarEntry(
            id = value.optString("id"),
            title = value.optString("title"),
            date = value.optString("date"),
            startTime = value.optString("startTime"),
            endTime = value.optString("endTime"),
            location = value.optString("location"),
            notes = value.optString("notes"),
            updatedAt = value.optLong("updatedAt"),
        )
    }
}

internal class CalendarRepository(context: Context) {
    private val file = File(context.filesDir, "calendar.json")

    fun list(): List<CalendarEntry> = synchronized(LOCK) {
        read().sortedWith(compareBy<CalendarEntry> { it.date }.thenBy { it.startTime }.thenByDescending { it.updatedAt })
    }

    fun create(title: String, date: String, start: String, end: String, location: String, notes: String): CalendarEntry = synchronized(LOCK) {
        val entry = CalendarEntry(UUID.randomUUID().toString(), title.trim(), date.trim(), start.trim(), end.trim(), location.trim(), notes.trim(), System.currentTimeMillis())
        write(read() + entry)
        entry
    }

    fun update(id: String, title: String, date: String, start: String, end: String, location: String, notes: String): CalendarEntry = synchronized(LOCK) {
        val records = read()
        val index = records.indexOfFirst { it.id == id }
        require(index >= 0) { "Event not found: $id" }
        val entry = CalendarEntry(id, title.trim(), date.trim(), start.trim(), end.trim(), location.trim(), notes.trim(), System.currentTimeMillis())
        write(records.toMutableList().also { it[index] = entry })
        entry
    }

    fun delete(id: String): Boolean = synchronized(LOCK) {
        val records = read()
        val kept = records.filterNot { it.id == id }
        if (kept.size == records.size) return@synchronized false
        write(kept)
        true
    }

    private fun read(): List<CalendarEntry> = runCatching {
        val input = JSONArray(file.readText())
        buildList {
            for (index in 0 until input.length()) {
                val item = input.optJSONObject(index) ?: continue
                if (item.optString("id").isNotBlank()) add(CalendarEntry.fromJson(item))
            }
        }
    }.getOrDefault(emptyList())

    private fun write(entries: List<CalendarEntry>) {
        val output = JSONArray()
        entries.forEach { output.put(it.toJson()) }
        file.writeText(output.toString())
    }

    companion object { private val LOCK = Any() }
}
