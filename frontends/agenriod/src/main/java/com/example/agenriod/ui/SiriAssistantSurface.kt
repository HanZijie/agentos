package com.example.agenriod.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.testTag
import com.example.agenriod.agent.AgentUiState

/**
 * Full-screen assistant surface intended for a system-assistant invocation.
 * All agent operations remain owned by the caller and flow through callbacks.
 */
@Composable
fun SiriAssistantSurface(
    state: AgentUiState,
    onDraftChange: (TextFieldValue) -> Unit,
    onSend: () -> Unit,
    onStop: () -> Unit,
    onVoice: () -> Unit,
    onDismiss: () -> Unit,
    isListening: Boolean = false,
    voiceHint: String = "",
    modifier: Modifier = Modifier,
) {
    val dark = Color(0xFF080A12)
    val transition = rememberInfiniteTransition(label = "assistant-orb")
    val pulse by transition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(tween(2200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "orb-pulse",
    )
    val latestAssistantIndex = state.messages.indexOfLast { it.role == "assistant" && it.text.isNotBlank() }
    val latestAssistant = state.messages.getOrNull(latestAssistantIndex)
    val latestUser = state.messages
        .take(if (latestAssistantIndex >= 0) latestAssistantIndex else state.messages.size)
        .lastOrNull { it.role == "user" && it.text.isNotBlank() }
    val status = when {
        voiceHint.isNotBlank() -> voiceHint
        isListening -> "正在聆听"
        state.isRunning -> "正在思考"
        state.status.contains("disconnect", ignoreCase = true) || state.status.contains("connect", ignoreCase = true) -> "正在连接 Agent"
        else -> "随时为你效劳"
    }

    Box(
        modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Color(0xFF101522), dark, Color(0xFF05060B)))
        ),
    ) {
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(Color(0x334B72FF), radius = size.minDimension * 0.46f, center = center.copy(y = center.y * 0.74f))
        }
        Column(
            Modifier.fillMaxSize().imePadding().navigationBarsPadding().padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                Modifier.fillMaxWidth().padding(top = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("AGENRIOD", color = Color(0xFFABB5D0), fontSize = 11.sp, letterSpacing = 2.4.sp, fontWeight = FontWeight.SemiBold)
                    Text(state.currentSession.title, color = Color.White, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                IconButton(onClick = onDismiss, modifier = Modifier.size(44.dp).testTag("assistant_close")) {
                    Icon(Icons.Default.Close, "关闭助手", tint = Color(0xFFD8DDF0))
                }
            }

            Spacer(Modifier.weight(0.7f))
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(250.dp)) {
                Box(
                    Modifier.size(216.dp).blur(32.dp).background(
                        Brush.radialGradient(listOf(Color(0xAA788CFF), Color(0x337D5AFF), Color.Transparent)), CircleShape
                    ),
                )
                Canvas(Modifier.size(196.dp * pulse)) {
                    drawCircle(
                        Brush.radialGradient(
                            0.0f to Color(0xFFFFF4FF),
                            0.18f to Color(0xFFBFC8FF),
                            0.46f to Color(0xFF827BFF),
                            0.72f to Color(0xFF40D9DB),
                            1.0f to Color(0xFF1C285D),
                        ),
                    )
                    drawCircle(Color.White.copy(alpha = 0.38f), radius = size.minDimension * 0.47f, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.2.dp.toPx()))
                }
                Text(if (state.isRunning) "···" else "✦", color = Color.White.copy(alpha = 0.9f), fontSize = 36.sp)
            }
            Spacer(Modifier.height(22.dp))
            Text(
                status,
                color = Color(0xFFF4F5FC),
                style = if (voiceHint.isNotBlank()) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp).testTag("assistant_status"),
            )
            Text(state.config.model, color = Color(0xFF929BB4), style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 6.dp))

            Spacer(Modifier.weight(0.45f))
            if (latestAssistant != null || latestUser != null) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
                        .background(Color(0xAA171B2A))
                        .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(24.dp))
                        .padding(horizontal = 18.dp, vertical = 15.dp),
                ) {
                    if (latestAssistant != null) {
                        latestUser?.text?.let {
                            Text(it, color = Color(0xFF9CA7C2), style = MaterialTheme.typography.labelMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                    Text(
                        latestAssistant?.text ?: latestUser?.text.orEmpty(),
                        color = Color(0xFFF2F4FA),
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 5,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(16.dp))
            } else {
                Text("你现在想做什么？", color = Color(0xFFB7C0D6), style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
                Spacer(Modifier.height(20.dp))
            }

            Surface(
                modifier = Modifier.fillMaxWidth().shadow(18.dp, RoundedCornerShape(30.dp)),
                shape = RoundedCornerShape(30.dp),
                color = Color(0xE61A1E2B),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x44FFFFFF)),
            ) {
                Row(
                    Modifier.height(62.dp).padding(start = 20.dp, end = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    BasicTextField(
                        value = state.draftValue,
                        onValueChange = onDraftChange,
                        modifier = Modifier.weight(1f).testTag("assistant_input"),
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyLarge.copy(color = Color.White),
                        cursorBrush = SolidColor(Color(0xFF92DFFF)),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = { if (state.draft.isNotBlank()) onSend() }),
                        decorationBox = { input ->
                            Box(contentAlignment = Alignment.CenterStart) {
                                if (state.draft.isBlank()) Text("向 Agenriod 提问…", color = Color(0xFF8D96AC), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                input()
                            }
                        },
                    )
                    IconButton(onClick = onVoice, modifier = Modifier.size(44.dp).testTag("assistant_voice")) {
                        Icon(Icons.Default.Mic, "语音输入", tint = if (isListening) Color(0xFF7DE2DE) else Color(0xFFAAB8D5))
                    }
                    FilledIconButton(
                        onClick = { if (state.isRunning) onStop() else onSend() },
                        enabled = state.isRunning || state.draft.isNotBlank(),
                        modifier = Modifier.size(46.dp).testTag("assistant_send"),
                        shape = CircleShape,
                    ) {
                        Icon(if (state.isRunning) Icons.Default.Stop else Icons.AutoMirrored.Filled.Send, if (state.isRunning) "停止" else "发送")
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
        }
    }
}
