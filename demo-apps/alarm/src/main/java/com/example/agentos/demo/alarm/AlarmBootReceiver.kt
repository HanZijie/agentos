package com.example.agentos.demo.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        AlarmRepository(context).list().filter { it.enabled && it.triggerAt > System.currentTimeMillis() }
            .forEach { AlarmScheduler.schedule(context, it) }
    }
}
