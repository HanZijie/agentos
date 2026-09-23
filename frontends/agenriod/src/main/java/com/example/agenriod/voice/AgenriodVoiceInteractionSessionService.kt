package com.example.agenriod.voice

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.IBinder
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.service.voice.VoiceInteractionSession
import android.service.voice.VoiceInteractionSessionService
import android.view.View
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.ComposeView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.example.agenriod.agent.AgentClient
import com.example.agenriod.agent.AgentService
import com.example.agenriod.ui.SiriAssistantSurface
import com.example.agenriod.ui.theme.AgenriodTheme

/** Session surface shown by the Android system assistant gesture. */
class AgenriodVoiceInteractionSessionService : VoiceInteractionSessionService() {
    override fun onNewSession(args: Bundle?): VoiceInteractionSession = AgenriodVoiceSession(this)
}

private class AgenriodVoiceSession(private val sessionContext: Context) : VoiceInteractionSession(sessionContext) {
    private val client = AgentClient(sessionContext)
    private var assistantView: ComposeView? = null
    private var viewLifecycleOwner: SessionLifecycleOwner? = null
    private var bound = false
    private var listening by mutableStateOf(false)
    private var voiceHint by mutableStateOf("")
    private var recognizer: SpeechRecognizer? = null
    private val voiceIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN")
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
    }
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, service: IBinder) {
            client.attach(service)
            bound = true
        }

        override fun onServiceDisconnected(name: ComponentName) {
            bound = false
            client.detach()
        }
    }

    override fun onCreateContentView(): View {
        ensureAgentBinding()
        return assistantView ?: ComposeView(sessionContext).also { view ->
            assistantView = view
            viewLifecycleOwner = SessionLifecycleOwner().also { owner ->
                view.setViewTreeLifecycleOwner(owner)
                view.setViewTreeSavedStateRegistryOwner(owner)
                owner.start()
            }
            view.setContent {
                val state by client.state.collectAsState()
                AgenriodTheme {
                    SiriAssistantSurface(
                        state = state,
                        onDraftChange = client::updateDraft,
                        onSend = client::send,
                        onStop = client::abort,
                        onVoice = ::toggleListening,
                        onDismiss = ::hide,
                        isListening = listening,
                        voiceHint = voiceHint,
                    )
                }
            }
        }
    }

    override fun onShow(args: Bundle?, flags: Int) {
        super.onShow(args, flags)
        if (assistantView == null) setContentView(onCreateContentView())
        viewLifecycleOwner?.resume()
        if (flags and (SHOW_SOURCE_ASSIST_GESTURE or SHOW_SOURCE_PUSH_TO_TALK) != 0) {
            startListening()
        }
    }

    override fun onHide() {
        stopListening()
        viewLifecycleOwner?.pause()
        // VoiceInteractionSession instances can be shown more than once. Keep
        // the Agent client and Binder connection alive across hide/show.
        super.onHide()
    }

    override fun onDestroy() {
        stopListening()
        recognizer?.destroy()
        recognizer = null
        viewLifecycleOwner?.destroy()
        viewLifecycleOwner = null
        assistantView?.disposeComposition()
        assistantView = null
        if (bound) sessionContext.unbindService(connection)
        bound = false
        client.close()
        super.onDestroy()
    }

    private fun ensureAgentBinding() {
        if (bound) return
        ContextCompat.startForegroundService(sessionContext, Intent(sessionContext, AgentService::class.java))
        bound = sessionContext.bindService(
            Intent(sessionContext, AgentService::class.java),
            connection,
            Context.BIND_AUTO_CREATE,
        )
    }

    private fun toggleListening() {
        if (listening) stopListening() else startListening()
    }

    private fun startListening() {
        if (ContextCompat.checkSelfPermission(sessionContext, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            voiceHint = "请先在 Agenriod 设置中授予麦克风权限"
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(sessionContext)) {
            voiceHint = "当前设备没有可用的语音服务"
            return
        }
        // Use the device's configured recognition service. The manifest stub
        // exists only to satisfy VoiceInteractionService metadata validation;
        // it is not selected here as the capture backend.
        val activeRecognizer = recognizer ?: SpeechRecognizer.createSpeechRecognizer(sessionContext).also {
            it.setRecognitionListener(recognitionListener)
            recognizer = it
        }
        voiceHint = ""
        listening = true
        runCatching { activeRecognizer.startListening(voiceIntent) }.onFailure {
            listening = false
            voiceHint = "语音输入暂不可用，请改用文字输入"
        }
    }

    private fun stopListening() {
        if (!listening) return
        listening = false
        runCatching { recognizer?.cancel() }
    }

    private val recognitionListener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            voiceHint = ""
        }

        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() { voiceHint = "正在转写" }
        override fun onPartialResults(partialResults: Bundle?) = Unit
        override fun onEvent(eventType: Int, params: Bundle?) = Unit

        override fun onResults(results: Bundle?) {
            listening = false
            voiceHint = ""
            val spoken = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
            if (!spoken.isNullOrBlank()) {
                val existing = client.state.value.draft.trim()
                client.setDraft(listOf(existing, spoken.trim()).filter(String::isNotBlank).joinToString(" "))
            }
        }

        override fun onError(error: Int) {
            listening = false
            voiceHint = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "没有听清，请再试一次"
                SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "语音服务暂不可用"
                SpeechRecognizer.ERROR_CLIENT -> "语音输入已停止"
                else -> "语音输入失败，请改用文字输入"
            }
        }
    }
}

/** Compose needs a lifecycle owner even though a voice session is not an Activity. */
private class SessionLifecycleOwner : LifecycleOwner, SavedStateRegistryOwner {
    private val registry = LifecycleRegistry(this)
    private val savedStateController = SavedStateRegistryController.create(this)
    override val lifecycle: Lifecycle get() = registry
    override val savedStateRegistry: SavedStateRegistry get() = savedStateController.savedStateRegistry

    fun start() {
        savedStateController.performAttach()
        savedStateController.performRestore(null)
        registry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        registry.handleLifecycleEvent(Lifecycle.Event.ON_START)
    }

    fun resume() {
        if (registry.currentState == Lifecycle.State.CREATED) {
            registry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        }
        if (registry.currentState == Lifecycle.State.STARTED) {
            registry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
        }
    }

    fun pause() {
        if (registry.currentState == Lifecycle.State.RESUMED) {
            registry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        }
        if (registry.currentState == Lifecycle.State.STARTED) {
            registry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
        }
    }

    fun destroy() {
        pause()
        registry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    }
}
