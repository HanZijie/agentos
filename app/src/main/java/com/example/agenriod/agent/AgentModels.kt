package com.example.agenriod.agent

import androidx.compose.ui.text.input.TextFieldValue

data class ModelConfig(
    val provider: String = "openai-compatible",
    val baseUrl: String = "https://api.openai.com/v1",
    val apiKey: String = "",
    val model: String = "gpt-4o-mini",
    val displayName: String = "OpenAI-compatible",
    val supportsVision: Boolean = true,
    val maxTokens: Int = 4096,
    val systemPrompt: String = "You are a helpful coding agent. Use the provided tools to inspect and edit the workspace."
)

data class ChatMessage(
    val id: String,
    val role: String,
    val text: String,
    val toolName: String? = null,
    val isError: Boolean = false,
    val isStreaming: Boolean = false
)

data class PluginSummary(
    val id: String,
    val name: String,
    val description: String = "",
    val toolCount: Int = 0,
)

data class SkillDefinition(
    val name: String,
    val description: String,
    val instruction: String,
)

data class SessionSummary(
    val id: String,
    val title: String,
    val updatedAt: Long,
)

data class TaskSummary(val id: String, val sessionId: String, val prompt: String, val status: String, val error: String = "")

data class AgentHostState(
    val tasks: List<TaskSummary> = emptyList(),
    val messages: List<ChatMessage> = emptyList(),
    val config: ModelConfig = ModelConfig(),
    val hooks: String = "",
    val pluginCount: Int = 0,
    val isRunning: Boolean = false,
    val status: String = "Ready",
    val currentSession: SessionSummary = SessionSummary("default", "New session", 0L),
    val sessions: List<SessionSummary> = emptyList(),
    val plugins: List<PluginSummary> = emptyList(),
    val skills: List<SkillDefinition> = emptyList(),
)

data class AgentUiState(
    val tasks: List<TaskSummary> = emptyList(),
    val messages: List<ChatMessage> = emptyList(),
    val draftValue: TextFieldValue = TextFieldValue(),
    val config: ModelConfig = ModelConfig(),
    val hooks: String = "",
    val pluginCount: Int = 0,
    val isRunning: Boolean = false,
    val status: String = "Ready",
    val showSettings: Boolean = false,
    val showSessions: Boolean = false,
    val settingsPage: String = "model",
    val currentSession: SessionSummary = SessionSummary("default", "New session", 0L),
    val sessions: List<SessionSummary> = emptyList(),
    val plugins: List<PluginSummary> = emptyList(),
    val skills: List<SkillDefinition> = emptyList(),
) {
    val draft: String get() = draftValue.text
}
