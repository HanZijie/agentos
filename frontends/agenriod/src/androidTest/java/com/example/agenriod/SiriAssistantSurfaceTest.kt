package com.example.agenriod

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.example.agenriod.agent.AgentUiState
import com.example.agenriod.ui.SiriAssistantSurface
import com.example.agenriod.ui.theme.AgenriodTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SiriAssistantSurfaceTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun assistantSurfaceSendsTypedPrompt() {
        var state by mutableStateOf(AgentUiState())
        var sent = ""
        compose.setContent {
            AgenriodTheme {
                SiriAssistantSurface(
                    state = state,
                    onDraftChange = { state = state.copy(draftValue = it) },
                    onSend = { sent = state.draft },
                    onStop = {},
                    onVoice = {},
                    onDismiss = {},
                )
            }
        }

        compose.onNodeWithTag("assistant_input").performTextInput("帮我总结这个页面")
        compose.onNodeWithTag("assistant_send").assertIsEnabled().performClick()
        compose.runOnIdle { assertEquals("帮我总结这个页面", sent) }
    }
}
