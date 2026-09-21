package com.example.agentos.demo.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

internal object AlarmScheduler {
    fun schedule(context: Context, item: AlarmItem) {
        val manager = context.getSystemService(AlarmManager::class.java)
        manager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            item.triggerAt.coerceAtLeast(System.currentTimeMillis() + 1000L),
            pendingIntent(context, item),
        )
    }

    fun cancel(context: Context, item: AlarmItem) {
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, item))
    }

    private fun pendingIntent(context: Context, item: AlarmItem): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java)
            .putExtra(AlarmReceiver.EXTRA_ID, item.id)
            .putExtra(AlarmReceiver.EXTRA_LABEL, item.label)
        return PendingIntent.getBroadcast(
            context,
            item.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
