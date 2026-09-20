package com.example.agenriod.agent

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.ByteBuffer
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import java.security.KeyStore

class AgentStore(context: Context, preferencesName: String = "agenriod_agent") {
    private val prefs = context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)

    fun loadConfig(): ModelConfig = ModelConfig(
        provider = prefs.getString("provider", null) ?: "openai-compatible",
        baseUrl = prefs.getString("baseUrl", null) ?: "https://api.openai.com/v1",
        apiKey = decrypt(prefs.getString("apiKeyCipher", null) ?: ""),
        model = prefs.getString("model", null) ?: "gpt-4o-mini",
        displayName = prefs.getString("displayName", null) ?: "OpenAI-compatible",
        supportsVision = prefs.getBoolean("supportsVision", true),
        maxTokens = prefs.getInt("maxTokens", 4096),
        systemPrompt = prefs.getString("systemPrompt", null)
            ?: "You are a helpful coding agent. Use the provided tools to inspect and edit the workspace."
    )

    fun loadHooks(): String = prefs.getString("hooks", "") ?: ""

    fun save(config: ModelConfig, hooks: String) {
        prefs.edit()
            .putString("provider", config.provider)
            .putString("baseUrl", config.baseUrl)
            .putString("apiKeyCipher", encrypt(config.apiKey))
            .putString("model", config.model)
            .putString("displayName", config.displayName)
            .putBoolean("supportsVision", config.supportsVision)
            .putInt("maxTokens", config.maxTokens)
            .putString("systemPrompt", config.systemPrompt)
            .putString("hooks", hooks)
            .apply()
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(false)
            .build())
        return generator.generateKey()
    }

    private fun encrypt(value: String): String {
        if (value.isEmpty()) return ""
        val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
        val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(ByteBuffer.allocate(4 + cipher.iv.size + encrypted.size).putInt(cipher.iv.size).put(cipher.iv).put(encrypted).array(), Base64.NO_WRAP)
    }

    private fun decrypt(value: String): String = runCatching {
        if (value.isEmpty()) return ""
        val bytes = Base64.decode(value, Base64.NO_WRAP)
        val buffer = ByteBuffer.wrap(bytes)
        val iv = ByteArray(buffer.int).also(buffer::get)
        val encrypted = ByteArray(buffer.remaining()).also(buffer::get)
        Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.DECRYPT_MODE, key(), javax.crypto.spec.GCMParameterSpec(128, iv)) }
            .doFinal(encrypted).toString(Charsets.UTF_8)
    }.getOrDefault("")

    private companion object {
        const val KEY_ALIAS = "agenriod_model_key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
