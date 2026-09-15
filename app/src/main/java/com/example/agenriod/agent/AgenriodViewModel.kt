package com.example.agenriod.agent

import android.app.Application
import androidx.lifecycle.AndroidViewModel

class AgenriodViewModel(application: Application) : AndroidViewModel(application) {
    val controller = AgenriodController(application)

    override fun onCleared() {
        controller.close()
    }
}
