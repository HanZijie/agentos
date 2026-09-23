package com.example.agentos.demo.records

import android.app.Service
import android.content.Intent
import android.os.IBinder

/** Service discovered by the latest AOSP AgentManagerService bootstrap. */
class SystemPluginEndpointService : Service() {
    override fun onBind(intent: Intent?): IBinder = (application as RecordsApplication).systemEndpoint
}
