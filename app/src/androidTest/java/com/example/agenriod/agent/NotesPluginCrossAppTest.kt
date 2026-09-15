package com.example.agenriod.agent

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID

/**
 * Proves the cross-APK Plugin Interface: the separately installed notes-plugin
 * APK is discovered by intent action, described, and invoked over AIDL.
 * Requires notes-plugin-debug.apk to be installed alongside the app.
 */
@RunWith(AndroidJUnit4::class)
class NotesPluginCrossAppTest {
    private val registry = AndroidPluginRegistry(InstrumentationRegistry.getInstrumentation().targetContext)

    @Test(timeout = 30000)
    fun describesAndInvokesSeparatelyInstalledNotesApk() {
        val plugins = registry.list()
        val notes = plugins.firstOrNull { it.optString("id") == "notes" }
            ?: throw AssertionError("notes plugin not discovered; is notes-plugin-debug.apk installed? found=${plugins.map { it.optString("id") }}")
        assertEquals(1, notes.optInt("protocolVersion"))
        assertEquals(2, notes.getJSONArray("tools").length())

        val marker = "cross-app-${UUID.randomUUID()}"
        val update = JSONObject(registry.invoke("notes", "notes.update",
            JSONObject().put("id", marker).put("title", marker).put("body", "written through AIDL")))
        assertTrue("update should report ok: $update", update.optBoolean("ok"))

        val search = JSONObject(registry.invoke("notes", "notes.search", JSONObject().put("query", marker)))
        val hits = search.getJSONArray("notes")
        assertEquals("search should find the note just written", 1, hits.length())
        assertEquals(marker, hits.getJSONObject(0).optString("title"))
    }
}
