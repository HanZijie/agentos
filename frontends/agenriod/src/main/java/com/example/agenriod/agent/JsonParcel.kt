package com.example.agenriod.agent

import android.content.Context
import android.os.ParcelFileDescriptor
import java.io.File

/** Binder carries a descriptor; payload size does not consume its 1 MiB buffer. */
internal object JsonParcel {
    fun write(context: Context, json: String): ParcelFileDescriptor {
        val file = File.createTempFile("agent-ipc-", ".json", context.cacheDir)
        return try {
            file.writeText(json)
            ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        } finally { file.delete() }
    }
    fun read(descriptor: ParcelFileDescriptor): String = ParcelFileDescriptor.AutoCloseInputStream(descriptor).use {
        val out = java.io.ByteArrayOutputStream()
        val bytes = ByteArray(8192)
        while (true) {
            val count = it.read(bytes)
            if (count < 0) break
            require(out.size() + count <= 24 * 1024 * 1024) { "IPC payload exceeds 24 MiB" }
            out.write(bytes, 0, count)
        }
        out.toString("UTF-8")
    }
}
