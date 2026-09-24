package com.example.agenriod

import android.text.InputType
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.platform.InterceptPlatformTextInput
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.example.agenriod.agent.AgentUiState
import com.example.agenriod.ui.CompactComposer
import com.example.agenriod.ui.theme.AgenriodTheme
import kotlinx.coroutines.awaitCancellation
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CompactComposerTest {
    @get:Rule val compose = createComposeRule()

    @Test
    @OptIn(ExperimentalComposeUiApi::class)
    fun chineseImeCompositionSurvivesUpdatesAndCommitsInOneLine() {
        var state by mutableStateOf(AgentUiState())
        var sent = ""
        lateinit var connection: InputConnection
        val attributes = EditorInfo()
        compose.setContent {
            AgenriodTheme {
                // Drive the real Compose InputConnection as a deterministic Pinyin IME.
                // Do not let Gboard commit the synthetic composition independently.
                InterceptPlatformTextInput(interceptor = { request, _ ->
                    connection = request.createInputConnection(attributes)
                    awaitCancellation()
                }) {
                Box(Modifier.width(320.dp)) {
                    CompactComposer(
                        value = state.draftValue,
                        onValueChange = { state = state.copy(draftValue = it) },
                        onSend = { sent = state.draft },
                        onStop = {}, onVoice = {}, onAttach = {},
                        isRunning = false, isListening = false, voiceAvailable = true,
                    )
                }
                }
            }
        }
        compose.onNodeWithTag("chat_input").performClick()
        compose.runOnIdle {
            assertEquals(0, attributes.inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE)
            assertEquals(0, attributes.imeOptions and EditorInfo.IME_FLAG_FORCE_ASCII)
            assertTrue(requireNotNull(attributes.hintLocales).toLanguageTags().contains("zh-CN"))
            connection.setComposingText("nihao", 1)
        }
        compose.runOnIdle {
            assertEquals("nihao", state.draft)
            assertNotNull(state.draftValue.composition)
            state = state.copy(status = "Background status update")
        }
        // The visible composing text is still valid input for the explicit
        // Send button; only the IME action waits for composition to finish.
        compose.onNodeWithTag("chat_send").assertIsEnabled().performClick()
        compose.runOnIdle { assertEquals("nihao", sent) }
        val chinese = "你好，请帮我检查这个文件，保留中文标点与原文。"
        compose.runOnIdle { connection.setComposingText(chinese, 1) }
        compose.runOnIdle {
            assertEquals(chinese, state.draft)
            assertNotNull(state.draftValue.composition)
            connection.finishComposingText()
        }
        compose.runOnIdle { assertNull(state.draftValue.composition) }
        compose.onNodeWithTag("chat_composer").assertHeightIsEqualTo(48.dp)
        listOf("chat_voice", "chat_attach", "chat_send").forEach {
            compose.onNodeWithTag(it).assertWidthIsEqualTo(40.dp)
        }
        compose.onNodeWithTag("chat_send").assertIsEnabled().performClick()
        compose.runOnIdle { assertEquals(chinese, sent) }
    }
}
