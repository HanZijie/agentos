package com.example.agenriod.agent

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class NotesPluginCrossAppTest {
    @Test(timeout = 45000)
    fun processRegistrationGatesToolsAndSurvivesBackground() {
        PluginBrokerTestClient.shell("am force-stop com.example.agenriod.notes")
        PluginBrokerTestClient().use { broker ->
            broker.awaitPlugin("notes", false)
            assertEquals("", PluginBrokerTestClient.shell("pidof com.example.agenriod.notes"))
            assertTrue(broker.invoke("notes", "notes.search", JSONObject()).has("error"))
            assertEquals("", PluginBrokerTestClient.shell("pidof com.example.agenriod.notes"))
            PluginBrokerTestClient.shell("am start -W -n com.example.agenriod.notes/.MainActivity")
            try {
                val notes = broker.awaitPlugin("notes", true)
                assertTrue(notes.getJSONArray("tools").length() >= 2)
                PluginBrokerTestClient.shell("am start -W -n com.example.agenriod/.MainActivity")
                assertTrue(PluginBrokerTestClient.shell("pidof com.example.agenriod.notes").isNotEmpty())
                broker.awaitPlugin("notes", true)
                PluginBrokerTestClient.await { broker.catalog().any { it.optString("id") == "notes" && it.getJSONArray("tools").toString().contains("mcp.notes.notes.stats") } }
                val ownerPid = PluginBrokerTestClient.shell("pidof com.example.agenriod.notes")
                val hostPid = PluginBrokerTestClient.shell("pidof com.example.agenriod:agent").toInt()
                android.os.Process.killProcess(hostPid)
                PluginBrokerTestClient.await { PluginBrokerTestClient.shell("pidof com.example.agenriod:agent").let { it.isNotEmpty() && it != hostPid.toString() } }
                broker.awaitPlugin("notes", true)
                PluginBrokerTestClient.await { broker.catalog().any { it.optString("id") == "notes" && it.getJSONArray("tools").toString().contains("mcp.notes.notes.stats") } }
                assertEquals("Plugin process must survive Host restart", ownerPid, PluginBrokerTestClient.shell("pidof com.example.agenriod.notes"))
                val stats = broker.invoke("notes", "mcp.notes.notes.stats", JSONObject())
                assertFalse(stats.optBoolean("isError"))
                assertEquals("streamable-http", stats.getJSONObject("structuredContent").getString("transport"))
                assertFalse("Credentials must not appear in catalog", broker.catalog().toString().contains("Authorization"))
                val marker = "cross-app-${UUID.randomUUID()}"
                assertTrue(broker.invoke("notes", "notes.update", JSONObject().put("id", marker).put("title", marker).put("body", "written through AIDL")).optBoolean("ok"))
                val hits = broker.invoke("notes", "notes.search", JSONObject().put("query", marker)).getJSONArray("notes")
                assertEquals(1, hits.length())
                assertEquals(marker, hits.getJSONObject(0).optString("title"))
            } finally { PluginBrokerTestClient.shell("am force-stop com.example.agenriod.notes") }
            assertEquals(0, broker.awaitPlugin("notes", false).getJSONArray("tools").length())
            assertTrue(broker.invoke("notes", "notes.search", JSONObject()).has("error"))
            assertTrue(broker.invoke("notes", "mcp.notes.notes.stats", JSONObject()).has("error"))
        }
    }
}
