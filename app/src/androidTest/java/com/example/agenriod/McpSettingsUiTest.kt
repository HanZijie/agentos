package com.example.agenriod

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

class McpSettingsUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun settingsExposeDirectStreamableHttpMcpEntry() {
        compose.onNodeWithContentDescription("Settings").performClick()
        compose.onNodeWithText("Plugins").performClick()
        compose.onNodeWithText("Add Streamable HTTP MCP").assertIsDisplayed()
        compose.onNodeWithText("MCP URL (HTTPS or loopback HTTP)").assertIsDisplayed()
        compose.onNodeWithText("Headers JSON (optional)").assertIsDisplayed()
        compose.onNodeWithText("Add MCP server").assertIsNotEnabled()
    }
}
