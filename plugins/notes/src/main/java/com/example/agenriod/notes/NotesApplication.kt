package com.example.agenriod.notes

import android.app.Application

/** The system AgentManagerService owns Plugin discovery and session lifetime. */
class NotesApplication : Application() {
    lateinit var endpoint: NotesPluginEndpoint
        private set
    private lateinit var mcp: NotesMcpServer
    override fun onCreate() {
        super.onCreate()
        mcp = NotesMcpServer(NotesRepository(this))
        endpoint = NotesPluginEndpoint(this, mcp.configuration)
    }
}
