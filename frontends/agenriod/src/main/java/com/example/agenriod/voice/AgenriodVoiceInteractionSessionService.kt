package com.example.agenriod.voice

import android.content.*
import android.graphics.Color
import android.service.voice.VoiceInteractionSession
import android.service.voice.VoiceInteractionSessionService
import android.view.View
import android.widget.*
import androidx.core.content.ContextCompat
import com.example.agenriod.agent.AgentClient
import com.example.agenriod.agent.AgentService
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest

/** Session surface shown by the system assistant gesture. */
class AgenriodVoiceInteractionSessionService : VoiceInteractionSessionService() {
    override fun onNewSession(args: android.os.Bundle?): VoiceInteractionSession = AgenriodVoiceSession(this)
}

private class AgenriodVoiceSession(private val sessionContext: Context) : VoiceInteractionSession(sessionContext) {
    private val client = AgentClient(sessionContext)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var transcript: TextView
    private lateinit var input: EditText
    private var bound = false
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, service: android.os.IBinder) { client.attach(service); bound = true }
        override fun onServiceDisconnected(name: ComponentName) { client.detach(); bound = false }
    }
    override fun onCreateContentView(): View {
        ContextCompat.startForegroundService(sessionContext, Intent(sessionContext, AgentService::class.java))
        sessionContext.bindService(Intent(sessionContext, AgentService::class.java), connection, Context.BIND_AUTO_CREATE)
        val root = LinearLayout(sessionContext).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 24, 28, 20); setBackgroundColor(Color.rgb(35, 35, 42)) }
        transcript = TextView(sessionContext).apply { setTextColor(Color.WHITE); textSize = 17f; text = "Agenriod\nAssistant ready"; setPadding(0, 0, 0, 14) }
        input = EditText(sessionContext).apply { hint = "Ask Agenriod…"; setTextColor(Color.WHITE); setHintTextColor(Color.LTGRAY); setSingleLine(true) }
        val send = Button(sessionContext).apply { text = "Send"; setOnClickListener { client.setDraft(input.text.toString()); client.send(); input.text.clear() } }
        root.addView(transcript, LinearLayout.LayoutParams(-1, 0, 1f)); root.addView(input, LinearLayout.LayoutParams(-1, -2)); root.addView(send, LinearLayout.LayoutParams(-1, -2))
        scope.launch { client.state.collectLatest { state -> transcript.text = state.messages.lastOrNull()?.text?.ifBlank { state.status } ?: state.status } }
        return root
    }
    override fun onShow(args: android.os.Bundle?, flags: Int) { super.onShow(args, flags); if (!::transcript.isInitialized) setContentView(onCreateContentView()) }
    override fun onHide() {
        if (bound) sessionContext.unbindService(connection)
        bound = false; client.close(); scope.cancel(); super.onHide()
    }
}
