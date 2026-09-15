package com.example.agenriod

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.example.agenriod.agent.AgentStore
import com.example.agenriod.agent.ModelConfig

import org.junit.Test
import org.junit.runner.RunWith

import org.junit.Assert.*

/**
 * Instrumented test, which will execute on an Android device.
 *
 * See [testing documentation](http://d.android.com/tools/testing).
 */
@RunWith(AndroidJUnit4::class)
class ExampleInstrumentedTest {
    @Test
    fun useAppContext() {
        // Context of the app under test.
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.example.agenriod", appContext.packageName)
    }

    @Test
    fun modelApiKeyRoundTripsThroughKeystore() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        val preferencesName = "agenriod-test-${java.util.UUID.randomUUID()}"
        val store = AgentStore(appContext, preferencesName)
        val expected = "sk-agenriod-test-key"
        try {
            store.save(ModelConfig(apiKey = expected), "")
            assertEquals(expected, store.loadConfig().apiKey)
        } finally {
            appContext.deleteSharedPreferences(preferencesName)
        }
    }
}
