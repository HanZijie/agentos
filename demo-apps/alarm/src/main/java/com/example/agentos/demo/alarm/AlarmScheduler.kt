package com.example.agentos.demo.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

internal object AlarmScheduler {
    fun schedule(context: Context, item: AlarmItem) {
        val manager = context.getSystemService(AlarmManager::class.java)
        val open = PendingIntent.getActivity(context, item.id.hashCode(),
            Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(item.triggerAt, open), pendingIntent(context, item))
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
