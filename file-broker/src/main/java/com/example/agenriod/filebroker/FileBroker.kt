package com.example.agenriod.filebroker

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException

/** Reference to a user granted document. Keep the URI; never turn it into a filesystem path. */
data class FileRef(val uri: Uri, val displayName: String? = null, val mimeType: String? = null)
data class BrokerFile(val ref: FileRef, val bytes: ByteArray, val mimeType: String?)

interface FileBroker {
    fun openDocumentIntent(mimeTypes: Array<String> = arrayOf("*/*")): Intent
    fun createDocumentIntent(mimeType: String, suggestedName: String): Intent
    fun persistPermission(uri: Uri, flags: Int)
    suspend fun read(ref: FileRef, maxBytes: Long = 10L * 1024 * 1024): BrokerFile
    suspend fun write(ref: FileRef, bytes: ByteArray)
}

/** SAF adapter. This module is deliberately separate from the app-private workspace tools. */
class AndroidFileBroker(context: Context) : FileBroker {
    private val resolver: ContentResolver = context.applicationContext.contentResolver
    override fun openDocumentIntent(mimeTypes: Array<String>): Intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE); type = if (mimeTypes.size == 1) mimeTypes[0] else "*/*"
        if (mimeTypes.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
    override fun createDocumentIntent(mimeType: String, suggestedName: String): Intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE); type = mimeType; putExtra(Intent.EXTRA_TITLE, suggestedName)
        addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
    override fun persistPermission(uri: Uri, flags: Int) {
        val persistable = flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        runCatching { resolver.takePersistableUriPermission(uri, persistable) }.getOrElse { throw IOException("Document permission was not persistable", it) }
    }
    override suspend fun read(ref: FileRef, maxBytes: Long): BrokerFile = withContext(Dispatchers.IO) {
        require(ref.uri.scheme == ContentResolver.SCHEME_CONTENT) { "File Broker accepts content:// URIs only" }
        val bytes = resolver.openInputStream(ref.uri)?.use { input -> input.readBytes(maxBytes) } ?: error("Unable to open document")
        BrokerFile(ref.copy(displayName = ref.displayName ?: queryName(ref.uri), mimeType = ref.mimeType ?: resolver.getType(ref.uri)), bytes, ref.mimeType ?: resolver.getType(ref.uri))
    }
    override suspend fun write(ref: FileRef, bytes: ByteArray) = withContext(Dispatchers.IO) {
        require(ref.uri.scheme == ContentResolver.SCHEME_CONTENT) { "File Broker accepts content:// URIs only" }
        resolver.openOutputStream(ref.uri, "wt")?.use { it.write(bytes) } ?: error("Unable to open document for writing")
    }
    private fun queryName(uri: Uri): String? = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
}

private fun java.io.InputStream.readBytes(maxBytes: Long): ByteArray {
    val output = java.io.ByteArrayOutputStream()
    val buffer = ByteArray(8192)
    var total = 0L
    while (true) {
        val read = read(buffer)
        if (read < 0) break
        total += read
        require(total <= maxBytes) { "Document exceeds $maxBytes bytes" }
        output.write(buffer, 0, read)
    }
    return output.toByteArray()
}
