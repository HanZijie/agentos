package com.example.agenriod.testing

import android.app.Activity
import android.os.Bundle
import androidx.test.runner.AndroidJUnitRunner

/** Credentials arrive through a shell-private temporary file, never instrumentation argument values. */
class LocalModelTestRunner : AndroidJUnitRunner() {
    private var options = Bundle()
    override fun onCreate(arguments: Bundle?) {
        options = arguments?.let(::Bundle) ?: Bundle()
        super.onCreate(arguments)
    }
    override fun onStart() {
        val path = options.getString("modelConfigFile")
        var applied = false
        if (!path.isNullOrBlank()) {
            try { applied = LocalAnthropicConfig.importFile(this, path) }
            catch (_: Exception) {
                finish(Activity.RESULT_CANCELED, Bundle().apply { putString("stream", "\nLocal Anthropic config import failed. No credential values were logged.\n") })
                return
            }
        }
        if (options.getString("modelSetupOnly") == "true") {
            finish(Activity.RESULT_OK, Bundle().apply { putString("stream", if (applied) "\nMODEL_CONFIG_APPLIED\n" else "\nMODEL_CONFIG_SKIPPED\n") })
            return
        }
        if (applied) sendStatus(0, Bundle().apply { putString("stream", "Local Anthropic settings imported.\n") })
        super.onStart()
    }
}
