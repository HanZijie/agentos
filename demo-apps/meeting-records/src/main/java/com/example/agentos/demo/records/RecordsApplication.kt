package com.example.agentos.demo.records

import android.app.Application
import com.example.agenriod.plugin.PluginProcessRegistration

class RecordsApplication : Application() {
    internal lateinit var repository: RecordsRepository
        private set

    private lateinit var mcp: RecordsMcpServer
    internal lateinit var endpoint: RecordsPluginEndpoint
        private set
    internal lateinit var systemEndpoint: SystemPluginEndpoint
        private set
    private lateinit var registration: PluginProcessRegistration

    override fun onCreate() {
        super.onCreate()
        repository = RecordsRepository(this)
        mcp = RecordsMcpServer(repository)
        endpoint = RecordsPluginEndpoint(repository, mcp.configuration)
        systemEndpoint = SystemPluginEndpoint(this, repository, mcp.configuration)
        registration = PluginProcessRegistration(this, endpoint)
    }

    override fun onTerminate() {
        registration.close()
        mcp.close()
        super.onTerminate()
    }
}
