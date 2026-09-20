package com.example.agenriod.notes

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

internal class NotesRepository(context: Context) {
    private val file = File(context.filesDir, "notes.json")
    fun search(query: String): JSONArray = synchronized(LOCK) { val q = query.trim().lowercase(); val input = read(); JSONArray().also { out -> for (i in 0 until input.length()) { val note = input.getJSONObject(i); if (q.isBlank() || note.toString().lowercase().contains(q)) out.put(note) } } }
    fun update(id: String, title: String, body: String): JSONArray = synchronized(LOCK) { val notes = read(); var found = false; for (i in 0 until notes.length()) if (notes.getJSONObject(i).optString("id") == id) { notes.getJSONObject(i).put("title", title).put("body", body); found = true }; if (!found) notes.put(JSONObject().put("id", id).put("title", title).put("body", body)); file.writeText(notes.toString()); notes }
    private fun read() = runCatching { JSONArray(file.readText()) }.getOrDefault(JSONArray())
    companion object { private val LOCK = Any() }
}
