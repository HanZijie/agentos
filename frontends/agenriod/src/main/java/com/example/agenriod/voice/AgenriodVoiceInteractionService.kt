package com.example.agenriod.voice

import android.service.voice.VoiceInteractionService
import android.util.Log

/** System assistant entry point. Hotwording is intentionally not enabled yet. */
class AgenriodVoiceInteractionService : VoiceInteractionService() {
    override fun onReady() { super.onReady(); Log.i(TAG, "voice assistant ready") }
    override fun onShutdown() { Log.i(TAG, "voice assistant shutdown"); super.onShutdown() }
    companion object { private const val TAG = "AgenriodVoice" }
}
