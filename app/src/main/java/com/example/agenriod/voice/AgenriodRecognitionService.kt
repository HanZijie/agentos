package com.example.agenriod.voice

import android.content.Intent
import android.speech.SpeechRecognizer
import android.speech.RecognitionService

/**
 * Stub recognizer. The platform refuses a VoiceInteractionService whose
 * metadata lacks android:recognitionService ("NOT VALID: No recognitionService
 * specified"), so a minimal one must exist even before hotword/ASR work.
 * It reports ERROR_CLIENT instead of listening; no microphone is opened.
 */
class AgenriodRecognitionService : RecognitionService() {
    override fun onStartListening(recognizerIntent: Intent?, listener: Callback) {
        runCatching { listener.error(SpeechRecognizer.ERROR_CLIENT) }
    }
    override fun onCancel(listener: Callback) {}
    override fun onStopListening(listener: Callback) {
        runCatching { listener.error(SpeechRecognizer.ERROR_CLIENT) }
    }
}
