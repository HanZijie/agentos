package com.example.agentos.demo.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val label = intent.getStringExtra(EXTRA_LABEL) ?: "闹钟提醒"
        val id = intent.getStringExtra(EXTRA_ID) ?: return
        val repository = AlarmRepository(context)
        runCatching { repository.setEnabled(id, false) }
        val manager = context.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "闹钟", NotificationManager.IMPORTANCE_HIGH))
        val openApp = PendingIntent.getActivity(
            context,
            id.hashCode(),
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = android.app.Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("闹钟提醒")
            .setContentText(label)
            .setAutoCancel(true)
            .setContentIntent(openApp)
            .build()
        manager.notify(id.hashCode(), notification)
    }

    companion object {
        const val EXTRA_ID = "alarm_id"
        const val EXTRA_LABEL = "alarm_label"
        private const val CHANNEL_ID = "demo-alarms"
    }
}
