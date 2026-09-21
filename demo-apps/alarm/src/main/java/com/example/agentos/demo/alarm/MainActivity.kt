package com.example.agentos.demo.alarm

import android.Manifest
import android.app.Activity
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var repository: AlarmRepository
    private lateinit var labelInput: EditText
    private lateinit var timeInput: EditText
    private lateinit var list: LinearLayout
    private lateinit var status: TextView
    private var selectedTriggerAt: Long = 0L

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        repository = AlarmRepository(this)
        requestNotificationPermission()
        setContentView(buildScreen())
        repository.list().filter { it.enabled && it.triggerAt > System.currentTimeMillis() }.forEach { AlarmScheduler.schedule(this, it) }
        refreshList()
    }

    private fun buildScreen(): View {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 32)
            setBackgroundColor(Color.rgb(251, 248, 246))
        }
        content.addView(TextView(this).apply { text = "闹钟"; textSize = 28f; setTextColor(Color.rgb(67, 42, 34)) })
        content.addView(TextView(this).apply {
            text = "设置一次性提醒，触发时发送通知"
            textSize = 15f
            setTextColor(Color.DKGRAY)
            setPadding(0, 4, 0, 18)
        })
        status = TextView(this).apply { setTextColor(Color.rgb(140, 74, 44)); setPadding(0, 0, 0, 8) }
        content.addView(status)
        labelInput = field("提醒内容，例如：站会开始")
        timeInput = field("提醒时间").apply { isFocusable = false; setOnClickListener { chooseTime() } }
        content.addView(labelInput); content.addView(timeInput)
        content.addView(button("设置闹钟") { saveAlarm() })
        content.addView(TextView(this).apply { text = "已设置闹钟"; textSize = 19f; setTextColor(Color.rgb(67, 42, 34)); setPadding(0, 24, 0, 8) })
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        content.addView(list)
        return ScrollView(this).apply { addView(content) }
    }

    private fun field(hint: String): EditText = EditText(this).apply {
        this.hint = hint
        textSize = 16f
        setPadding(16, 8, 16, 8)
        setBackgroundColor(Color.WHITE)
        layoutParams = LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT).apply { setMargins(0, 0, 0, 10) }
    }

    private fun button(label: String, action: () -> Unit): Button = Button(this).apply { text = label; setOnClickListener { action() } }

    private fun chooseTime() {
        val current = Calendar.getInstance().apply { add(Calendar.MINUTE, 2) }
        TimePickerDialog(this, { _, hour, minute ->
            val selected = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour); set(Calendar.MINUTE, minute); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
            }
            selectedTriggerAt = selected.timeInMillis
            timeInput.setText(SimpleDateFormat("MM-dd HH:mm", Locale.US).format(selected.time))
        }, current.get(Calendar.HOUR_OF_DAY), current.get(Calendar.MINUTE), true).show()
    }

    private fun saveAlarm() {
        if (selectedTriggerAt <= System.currentTimeMillis()) {
            status.text = "请选择未来的提醒时间"
            return
        }
        val item = repository.create(labelInput.text.toString(), selectedTriggerAt)
        AlarmScheduler.schedule(this, item)
        status.text = "已设置：${item.label}"
        labelInput.text.clear(); timeInput.text.clear(); selectedTriggerAt = 0L
        refreshList()
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
        }
    }

    private fun refreshList() {
        if (!::list.isInitialized) return
        list.removeAllViews()
        val items = repository.list()
        if (items.isEmpty()) {
            list.addView(TextView(this).apply { text = "还没有闹钟。"; setTextColor(Color.GRAY); setPadding(0, 8, 0, 8) })
            return
        }
        items.forEach { item ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(18, 12, 12, 12)
                setBackgroundColor(Color.WHITE)
                layoutParams = LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT).apply { setMargins(0, 0, 0, 10) }
            }
            val info = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) }
            info.addView(TextView(this).apply { text = item.label; textSize = 18f; setTextColor(Color.rgb(67, 42, 34)) })
            info.addView(TextView(this).apply { text = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(item.triggerAt); setTextColor(Color.DKGRAY); setPadding(0, 4, 0, 0) })
            card.addView(info)
            val enabled = CheckBox(this).apply {
                isChecked = item.enabled
                contentDescription = "启用 ${item.label}"
                setOnCheckedChangeListener { _, checked ->
                    val updated = repository.setEnabled(item.id, checked)
                    if (checked) AlarmScheduler.schedule(this@MainActivity, updated) else AlarmScheduler.cancel(this@MainActivity, updated)
                    status.text = if (checked) "已启用：${item.label}" else "已停用：${item.label}"
                }
            }
            card.addView(enabled)
            card.addView(Button(this).apply {
                text = "删除"
                setOnClickListener {
                    AlarmScheduler.cancel(this@MainActivity, item)
                    repository.delete(item.id)
                    status.text = "已删除：${item.label}"
                    refreshList()
                }
            })
            list.addView(card)
        }
    }
}
