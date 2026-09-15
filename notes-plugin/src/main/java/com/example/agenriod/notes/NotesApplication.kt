package com.example.agenriod.notes

import android.app.Application
import com.example.agenriod.plugin.PluginProcessRegistration

/** Registration is process-scoped; moving the Notes Activity to the background keeps it active. */
class NotesApplication : Application() {
    lateinit var endpoint: NotesPluginEndpoint
        private set
    private lateinit var mcp: NotesMcpServer
    private lateinit var registration: PluginProcessRegistration
    override fun onCreate() {
        super.onCreate()
        mcp = NotesMcpServer(NotesRepository(this))
        endpoint = NotesPluginEndpoint(this, mcp.configuration)
        registration = PluginProcessRegistration(this, endpoint)
    }
}
