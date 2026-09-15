package com.example.agenriod

import android.content.Intent
import android.content.ComponentName
import android.content.ServiceConnection
import android.os.IBinder
import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Build
import android.provider.Settings
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.RecognitionListener
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.core.content.ContextCompat
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.InterceptPlatformTextInput
import androidx.compose.ui.platform.PlatformTextInputInterceptor
import androidx.compose.ui.platform.PlatformTextInputMethodRequest
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.example.agenriod.agent.AgentUiState
import com.example.agenriod.agent.AgentClient
import com.example.agenriod.agent.AgentService
import com.example.agenriod.agent.ChatMessage
import com.example.agenriod.agent.ImageAttachment
import com.example.agenriod.agent.PluginSummary
import com.example.agenriod.agent.SessionSummary
import com.example.agenriod.agent.SkillDefinition
import com.example.agenriod.agent.TaskSummary
import com.example.agenriod.ui.theme.AgenriodTheme
import com.example.agenriod.ui.shortcutWord
import com.example.agenriod.ui.insertShortcut
import com.example.agenriod.ui.CompactComposer
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private lateinit var client: AgentClient
    private var bound = false
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, service: IBinder) { client.attach(service) }
        override fun onServiceDisconnected(name: ComponentName) { client.detach() }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        client = AgentClient(applicationContext)
        setContent { AgenriodApp(client) }
        val intent = Intent(this, AgentService::class.java)
        ContextCompat.startForegroundService(this, intent)
        bound = bindService(intent, connection, BIND_AUTO_CREATE)
    }

    override fun onDestroy() {
        client.close()
        if (bound) unbindService(connection)
        bound = false
        super.onDestroy()
    }
}

@Composable
@OptIn(ExperimentalComposeUiApi::class)
private fun AgenriodApp(host: AgentClient) {
    val state by host.state.collectAsState()
    val view = LocalView.current
    DisposableEffect(view) {
        val previous = if (Build.VERSION.SDK_INT >= 33) view.isAutoHandwritingEnabled else false
        if (Build.VERSION.SDK_INT >= 33) view.isAutoHandwritingEnabled = false
        onDispose { if (Build.VERSION.SDK_INT >= 33) view.isAutoHandwritingEnabled = previous }
    }
    val inputInterceptor = remember {
        PlatformTextInputInterceptor { request, next ->
            next.startInputMethod(PlatformTextInputMethodRequest { attributes ->
                request.createInputConnection(attributes).also {
                    if (Build.VERSION.SDK_INT >= 35) attributes.setStylusHandwritingEnabled(false)
                    attributes.extras = (attributes.extras ?: Bundle()).apply {
                        putBoolean("androidx.core.view.inputmethod.EditorInfoCompat.STYLUS_HANDWRITING_ENABLED", false)
                    }
                }
            })
        }
    }
    AgenriodTheme {
        InterceptPlatformTextInput(inputInterceptor) { AgentScreen(state, host) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AgentScreen(state: AgentUiState, host: AgentClient) {
    Scaffold(topBar = {
        TopAppBar(title = {
            Column {
                Text(state.currentSession.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold)
                Text(state.status, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
        }, actions = {
            TextButton(onClick = host::toggleSessions) { Text("Sessions") }
            FilterChip(selected = false, onClick = host::toggleSettings, label = { Text(state.config.model, maxLines = 1) })
            IconButton(onClick = host::toggleSettings) { Icon(Icons.Default.Settings, contentDescription = "Settings") }
        })
    }) { padding ->
        when {
            state.showSessions -> SessionPane(state, host, Modifier.padding(padding))
            state.showSettings -> SettingsPane(state, host, Modifier.padding(padding))
            else -> ChatPane(state, host, Modifier.padding(padding))
        }
    }
}

@Composable
private fun ChatPane(state: AgentUiState, host: AgentClient, modifier: Modifier = Modifier) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val editor = state.draftValue
    var pickedImage by remember { mutableStateOf<ImageAttachment?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch { pickedImage = host.readImage(uri) }
    }
    val context = androidx.compose.ui.platform.LocalContext.current
    val currentDraft by rememberUpdatedState(state.draft)
    var listening by remember { mutableStateOf(false) }
    var voiceStatus by remember { mutableStateOf("") }
    val recognizer = remember(context) { if (SpeechRecognizer.isRecognitionAvailable(context)) SpeechRecognizer.createSpeechRecognizer(context) else null }
    val voiceIntent = remember {
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        }
    }
    DisposableEffect(recognizer) {
        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { voiceStatus = "正在聆听，请说中文…" }
            override fun onBeginningOfSpeech() = Unit
            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() { voiceStatus = "正在转写…" }
            override fun onPartialResults(partialResults: Bundle?) = Unit
            override fun onEvent(eventType: Int, params: Bundle?) = Unit
            override fun onResults(results: Bundle?) {
                listening = false
                voiceStatus = ""
                val spoken = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                if (!spoken.isNullOrBlank()) host.setDraft((currentDraft + " " + spoken).trim())
            }
            override fun onError(error: Int) {
                listening = false
                voiceStatus = when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "未识别到语音，请点击麦克风重试。"
                    SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "语音服务暂不可用，请检查网络。"
                    else -> "语音输入已停止，可点击麦克风重试。"
                }
            }
        })
        onDispose { recognizer?.destroy() }
    }
    val requestAudio = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) { listening = true; recognizer?.startListening(voiceIntent) }
        else voiceStatus = "语音输入需要麦克风权限。"
    }
    LaunchedEffect(state.messages.size, state.messages.lastOrNull()?.text) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }
    val word = if (editor.selection.collapsed && editor.composition == null) shortcutWord(editor.text, editor.selection.start) else null
    val token = word?.query.orEmpty()
    val suggestions = when {
        token.startsWith("@") -> state.plugins.filter { it.active && (it.name.contains(token.drop(1), true) || it.id.contains(token.drop(1), true)) }.take(5)
        token.startsWith("/") -> state.skills.filter { it.name.startsWith(token.drop(1), true) }.take(5)
        else -> emptyList()
    }
    Column(modifier.fillMaxSize().imePadding()) {
        if (state.messages.isEmpty()) EmptyState(Modifier.weight(1f))
        else LazyColumn(state = listState, modifier = Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(state.messages, key = { it.id }) { MessageCard(it) }
        }
        Surface(color = MaterialTheme.colorScheme.background, modifier = Modifier.fillMaxWidth().navigationBarsPadding()) {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                if (suggestions.isNotEmpty()) SuggestionList(suggestions) { selected ->
                    word?.let { active ->
                        val inserted = insertShortcut(editor.text, active, selected)
                        host.updateDraft(TextFieldValue(inserted.text, TextRange(inserted.cursor)))
                    }
                }
                if (token.startsWith("@") && suggestions.isEmpty()) {
                    Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(if (state.plugins.isEmpty()) "No plugins installed" else "No matching plugin", style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(1f))
                        TextButton(onClick = host::openPluginManager) { Text("Manage plugins") }
                    }
                }
                if (voiceStatus.isNotBlank()) Text(voiceStatus, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 6.dp))
                if (pickedImage != null) Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("图片已添加", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    TextButton(onClick = { pickedImage = null }) { Text("移除") }
                }
                CompactComposer(
                    value = editor,
                    onValueChange = host::updateDraft,
                    onSend = { host.send(listOfNotNull(pickedImage)); pickedImage = null },
                    onStop = host::abort,
                    onVoice = {
                        if (listening) { recognizer?.stopListening(); listening = false }
                        else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) { listening = true; recognizer?.startListening(voiceIntent) }
                        else requestAudio.launch(Manifest.permission.RECORD_AUDIO)
                    },
                    onAttach = { picker.launch("image/*") },
                    isRunning = state.isRunning,
                    isListening = listening,
                    voiceAvailable = recognizer != null,
                )
            }
        }
    }
}

@Composable
private fun SuggestionList(suggestions: List<Any>, onSelect: (String) -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
        Column(Modifier.padding(vertical = 4.dp)) {
            suggestions.forEach { suggestion ->
                when (suggestion) {
                    is PluginSummary -> SuggestionRow("@${suggestion.name}", suggestion.description.ifBlank { "${suggestion.toolCount} tools" }) { onSelect("@${suggestion.id}") }
                    is SkillDefinition -> SuggestionRow("/${suggestion.name}", suggestion.description) { onSelect("/${suggestion.name}") }
                }
            }
        }
    }
}

@Composable
private fun SuggestionRow(title: String, description: String, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.Start) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(description, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EmptyState(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Agenriod", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
            Text("A native Pi coding agent for your workspace", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Try  @plugin  or  /review  in the composer", style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun MessageCard(message: ChatMessage) {
    val isUser = message.role == "user"
    val isTool = message.role == "tool"
    if (isTool) { ToolActivity(message); return }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Card(modifier = Modifier.fillMaxWidth(if (isTool) 0.94f else 0.88f), colors = CardDefaults.cardColors(containerColor = when {
            isUser -> MaterialTheme.colorScheme.primaryContainer
            isTool -> MaterialTheme.colorScheme.surfaceVariant
            message.isError -> MaterialTheme.colorScheme.errorContainer
            else -> MaterialTheme.colorScheme.surface
        }), shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(14.dp)) {
                Text(when { isUser -> "You"; isTool -> "Tool · ${message.toolName}"; else -> "Agenriod" }, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(5.dp))
                MessageBody(message.text.ifBlank { if (message.isStreaming) "…" else "(empty response)" })
                if (message.isStreaming) Text("●", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun ToolActivity(message: ChatMessage) {
    var expanded by remember(message.id) { mutableStateOf(false) }
    Card(modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded }, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(if (message.isStreaming) "●" else if (message.isError) "!" else "✓", color = if (message.isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.width(9.dp))
                Text(message.toolName.orEmpty(), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
                Text(if (message.isStreaming) "Running" else if (message.isError) "Failed" else "Done", style = MaterialTheme.typography.labelSmall)
                Spacer(Modifier.width(10.dp))
                Text(if (expanded) "−" else "+")
            }
            if (expanded) SelectionContainer {
                Text(message.text, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 10.dp))
            }
        }
    }
}

@Composable
private fun MessageBody(text: String) {
    SelectionContainer {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            text.split("```").forEachIndexed { index, block ->
                if (index % 2 == 1) {
                    val code = block.substringAfter('\n', block).trimEnd()
                    Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(9.dp)) {
                        Text(code, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(10.dp))
                    }
                } else if (block.isNotBlank()) {
                    Text(block.trim())
                }
            }
        }
    }
}

@Composable
private fun SettingsPane(state: AgentUiState, host: AgentClient, modifier: Modifier = Modifier) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var config by remember(state.config) { mutableStateOf(state.config) }
    var hooks by remember(state.hooks) { mutableStateOf(state.hooks) }
    Column(modifier.fillMaxSize().padding(horizontal = 18.dp).imePadding()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Settings", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            TextButton(onClick = host::toggleSettings) { Text("Done") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = state.settingsPage == "model", onClick = host::openModelSettings, label = { Text("Model") })
            FilterChip(selected = state.settingsPage == "plugins", onClick = host::openPluginManager, label = { Text("Plugins") })
            FilterChip(selected = state.settingsPage == "hooks", onClick = host::openHooks, label = { Text("Hooks") })
        }
        OutlinedButton(onClick = { context.startActivity(Intent(Settings.ACTION_VOICE_INPUT_SETTINGS)) }, modifier = Modifier.fillMaxWidth()) { Text("Choose Agenriod as system assistant") }
        when (state.settingsPage) {
            "plugins" -> PluginManagement(state, host, Modifier.weight(1f))
            "hooks" -> HookSettings(hooks, { hooks = it }, Modifier.weight(1f))
            else -> ModelSettings(config, { config = it }, Modifier.weight(1f))
        }
        if (state.settingsPage != "plugins") Button(onClick = { host.updateConfig(config); host.updateHooks(hooks); host.saveSettings("") }, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) { Text("Save settings") }
    }
}

@Composable
private fun ModelSettings(config: com.example.agenriod.agent.ModelConfig, onChange: (com.example.agenriod.agent.ModelConfig) -> Unit, modifier: Modifier) {
    var expanded by remember { mutableStateOf(false) }
    LazyColumn(modifier, verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 16.dp, bottom = 12.dp)) {
        item {
            Text("Provider", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Box {
                OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text(config.provider) }
                DropdownMenuCompat(expanded, { expanded = false }) { provider ->
                    onChange(when (provider) {
                        "gemini" -> config.copy(provider = provider, baseUrl = "https://generativelanguage.googleapis.com/v1beta", model = if (config.model == "gpt-4o-mini") "gemini-2.0-flash" else config.model)
                        "anthropic" -> config.copy(provider = provider, baseUrl = if (config.baseUrl.contains("generativelanguage.googleapis.com")) "https://api.anthropic.com/v1" else config.baseUrl)
                        else -> config.copy(provider = provider, baseUrl = if (config.baseUrl.contains("generativelanguage.googleapis.com")) "https://api.openai.com/v1" else config.baseUrl)
                    })
                    expanded = false
                }
            }
        }
        item { SettingField("Endpoint", config.baseUrl) { onChange(config.copy(baseUrl = it)) } }
        item { SettingField("Model id", config.model) { onChange(config.copy(model = it)) } }
        item { OutlinedTextField(config.apiKey, { onChange(config.copy(apiKey = it)) }, Modifier.fillMaxWidth(), label = { Text("API key · encrypted locally") }, visualTransformation = PasswordVisualTransformation()) }
        item { SettingField("System prompt", config.systemPrompt, 3) { onChange(config.copy(systemPrompt = it)) } }
    }
}

@Composable
private fun HookSettings(hooks: String, onChange: (String) -> Unit, modifier: Modifier) {
    Column(modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Bash hooks", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text("Run before or after every tool. A failing before hook blocks execution.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(hooks, onChange, Modifier.fillMaxWidth(), minLines = 5, maxLines = 10, label = { Text("before_tool|command") })
        Text("Environment: AGENT_EVENT, AGENT_TOOL, AGENT_ARGS_JSON", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PluginManagement(state: AgentUiState, host: AgentClient, modifier: Modifier) {
    var manifest by remember { mutableStateOf("") }
    Column(modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Installed plugins", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        if (state.plugins.isEmpty()) Text("No plugins yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
        else LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.plugins, key = { it.id }) { plugin ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text(plugin.name, fontWeight = FontWeight.SemiBold); Text("${plugin.toolCount} tools · ${plugin.id}", style = MaterialTheme.typography.labelSmall); Text(plugin.status, style = MaterialTheme.typography.labelSmall) }
                        if (plugin.packageName.isBlank()) TextButton(onClick = { host.deletePlugin(plugin.id) }) { Text("Delete") }
                    }
                }
            }
        }
        HorizontalDivider()
        TextButton(onClick = { manifest = EXAMPLE_PLUGIN_MANIFEST }) { Text("Use example manifest") }
        OutlinedTextField(manifest, { manifest = it }, Modifier.fillMaxWidth(), minLines = 4, maxLines = 8, label = { Text("Plugin manifest JSON") })
        Button(onClick = { host.saveSettings(manifest); manifest = "" }, enabled = manifest.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("Install plugin") }
    }
}

private val EXAMPLE_PLUGIN_MANIFEST = """
    {
      "id": "workspace-info",
      "name": "Workspace Info",
      "description": "Inspect files in the current workspace",
      "tools": [{
        "name": "list",
        "description": "List workspace files",
        "parameters": {"type": "object", "properties": {}},
        "command": "ls -la"
      }]
    }
""".trimIndent()

@Composable
private fun SessionPane(state: AgentUiState, host: AgentClient, modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("Sessions", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold); Text("Switch or start a focused workspace conversation", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Button(onClick = host::newSession) { Text("New") }
        }
        val recoverable = state.tasks.filter { it.status == "interrupted" || it.status == "failed" || it.status == "running" || it.status == "queued" }
        if (recoverable.isNotEmpty()) {
            Text("Tasks", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            recoverable.forEach { task -> TaskRecoveryRow(task, host) }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            items(state.sessions, key = { it.id }) { session -> SessionRow(session, session.id == state.currentSession.id, host) }
        }
    }
}

@Composable
private fun TaskRecoveryRow(task: TaskSummary, host: AgentClient) {
    Card(Modifier.fillMaxWidth().padding(vertical = 4.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(task.prompt, maxLines = 2, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
                Text(task.status + if (task.error.isBlank()) "" else " · ${task.error.take(80)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (task.status == "interrupted" || task.status == "failed") TextButton(onClick = { host.retryTask(task.id) }) { Text("Retry") }
            if (task.status == "queued" || task.status == "running") TextButton(onClick = { host.cancelTask(task.id) }) { Text("Stop") }
        }
    }
}

@Composable
private fun SessionRow(session: SessionSummary, selected: Boolean, host: AgentClient) {
    var renaming by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var title by remember(session.title) { mutableStateOf(session.title) }
    Card(colors = CardDefaults.cardColors(containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp)) {
            Text(session.title, fontWeight = FontWeight.SemiBold)
            val updated = java.text.SimpleDateFormat("MMM d · HH:mm", java.util.Locale.getDefault()).format(java.util.Date(session.updatedAt))
            Text((if (selected) "Current · " else "") + updated, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { renaming = true }) { Text("Rename") }
                TextButton(onClick = { deleting = true }) { Text("Delete") }
                TextButton(onClick = { host.switchSession(session.id) }) { Text(if (selected) "Return" else "Open") }
            }
        }
    }
    if (renaming) AlertDialog(onDismissRequest = { renaming = false }, title = { Text("Rename session") }, text = { OutlinedTextField(title, { title = it }, singleLine = true) }, confirmButton = { TextButton(onClick = { host.renameSession(session.id, title); renaming = false }) { Text("Save") } }, dismissButton = { TextButton(onClick = { renaming = false }) { Text("Cancel") } })
    if (deleting) AlertDialog(onDismissRequest = { deleting = false }, title = { Text("Delete session?") }, text = { Text("The conversation “${session.title}” will be removed from this device.") }, confirmButton = { TextButton(onClick = { host.deleteSession(session.id); deleting = false }) { Text("Delete") } }, dismissButton = { TextButton(onClick = { deleting = false }) { Text("Cancel") } })
}

@Composable
private fun DropdownMenuCompat(expanded: Boolean, onDismiss: () -> Unit, onSelect: (String) -> Unit) {
    DropdownMenu(expanded = expanded, onDismissRequest = onDismiss) {
        listOf("openai-compatible", "anthropic", "gemini").forEach { value -> DropdownMenuItem(text = { Text(value) }, onClick = { onSelect(value) }) }
    }
}

@Composable
private fun SettingField(label: String, value: String, minLines: Int = 1, onValueChange: (String) -> Unit) {
    OutlinedTextField(value, onValueChange, Modifier.fillMaxWidth(), label = { Text(label) }, minLines = minLines)
}
