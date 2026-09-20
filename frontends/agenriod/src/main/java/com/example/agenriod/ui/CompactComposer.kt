package com.example.agenriod.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalMinimumInteractiveComponentSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.intl.LocaleList
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/** Keep the IME's selection and composing range intact, including uncommitted Pinyin. */
@Composable
internal fun CompactComposer(
    value: TextFieldValue,
    onValueChange: (TextFieldValue) -> Unit,
    onSend: () -> Unit,
    onStop: () -> Unit,
    onVoice: () -> Unit,
    onAttach: () -> Unit,
    isRunning: Boolean,
    isListening: Boolean,
    voiceAvailable: Boolean,
    modifier: Modifier = Modifier,
) {
    val canSend = value.text.isNotBlank() && value.composition == null && !isRunning
    Surface(
        modifier = modifier.fillMaxWidth().testTag("chat_composer"),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        CompositionLocalProvider(LocalMinimumInteractiveComponentSize provides 40.dp) {
            Row(
                Modifier.heightIn(min = 48.dp).padding(start = 16.dp, end = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.weight(1f).testTag("chat_input").semantics { contentDescription = "消息输入框" },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Send,
                        hintLocales = LocaleList("zh-CN,en-US"),
                    ),
                    keyboardActions = KeyboardActions(onSend = { if (canSend) onSend() }),
                    decorationBox = { input ->
                        Box(Modifier.fillMaxWidth().heightIn(min = 40.dp), contentAlignment = Alignment.CenterStart) {
                            if (value.text.isEmpty()) Text(
                                "输入消息…",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodyLarge,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            input()
                        }
                    },
                )
                IconButton(onClick = onVoice, enabled = voiceAvailable, modifier = Modifier.size(40.dp).testTag("chat_voice")) {
                    Icon(Icons.Default.Mic, if (isListening) "停止语音输入" else "中文语音输入", Modifier.size(20.dp), tint = if (isListening) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onAttach, modifier = Modifier.size(40.dp).testTag("chat_attach")) {
                    Icon(Icons.Default.Add, "添加图片", Modifier.size(20.dp))
                }
                FilledIconButton(
                    onClick = { if (isRunning) onStop() else if (canSend) onSend() },
                    enabled = isRunning || canSend,
                    modifier = Modifier.size(40.dp).testTag("chat_send"),
                    shape = CircleShape,
                ) {
                    Icon(if (isRunning) Icons.Default.Stop else Icons.AutoMirrored.Filled.Send, if (isRunning) "停止生成" else "发送消息", Modifier.size(18.dp))
                }
            }
        }
    }
}
