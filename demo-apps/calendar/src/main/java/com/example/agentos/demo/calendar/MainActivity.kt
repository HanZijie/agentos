package com.example.agentos.demo.calendar

import android.app.Activity
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var repository: CalendarRepository
    private lateinit var titleInput: EditText
    private lateinit var dateInput: EditText
    private lateinit var startInput: EditText
    private lateinit var endInput: EditText
    private lateinit var locationInput: EditText
    private lateinit var notesInput: EditText
    private lateinit var list: LinearLayout
    private lateinit var status: TextView
    private var selectedId: String? = null

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        repository = CalendarRepository(this)
        setContentView(buildScreen())
        refreshList()
    }

    override fun onResume() { super.onResume(); if (::repository.isInitialized) refreshList() }

    private fun buildScreen(): View {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 32)
            setBackgroundColor(Color.rgb(247, 250, 248))
        }
        content.addView(TextView(this).apply {
            text = "日程"
            textSize = 28f
            setTextColor(Color.rgb(27, 50, 39))
        })
        content.addView(TextView(this).apply {
            text = "编辑今天和接下来的安排"
            textSize = 15f
            setTextColor(Color.DKGRAY)
            setPadding(0, 4, 0, 18)
        })
        status = TextView(this).apply { setTextColor(Color.rgb(37, 102, 71)); setPadding(0, 0, 0, 8) }
        content.addView(status)

        titleInput = field("日程标题")
        dateInput = field("日期").apply { isFocusable = false; setOnClickListener { chooseDate() } }
        startInput = field("开始时间").apply { isFocusable = false; setOnClickListener { chooseTime(this) } }
        endInput = field("结束时间").apply { isFocusable = false; setOnClickListener { chooseTime(this) } }
        locationInput = field("地点（可选）")
        notesInput = field("备注（可选）").apply {
            minLines = 3
            gravity = Gravity.TOP
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
        }
        listOf(titleInput, dateInput, startInput, endInput, locationInput, notesInput).forEach(content::addView)

        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        actions.addView(button("保存") { saveEntry() }, weight = 1f)
        actions.addView(button("清空") { clearEditor() }, weight = 1f)
        actions.addView(button("删除") { deleteSelected() }, weight = 1f)
        content.addView(actions)

        content.addView(TextView(this).apply {
            text = "日程列表"
            textSize = 19f
            setTextColor(Color.rgb(27, 50, 39))
            setPadding(0, 24, 0, 8)
        })
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

    private fun button(label: String, action: () -> Unit): Button = Button(this).apply {
        text = label
        setOnClickListener { action() }
        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT)
    }

    private fun LinearLayout.addView(view: View, weight: Float) {
        (view.layoutParams as? LinearLayout.LayoutParams)?.weight = weight
        addView(view)
    }

    private fun chooseDate() {
        val current = Calendar.getInstance()
        DatePickerDialog(this, { _, year, month, day ->
            dateInput.setText(String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day))
        }, current.get(Calendar.YEAR), current.get(Calendar.MONTH), current.get(Calendar.DAY_OF_MONTH)).show()
    }

    private fun chooseTime(target: EditText) {
        val current = Calendar.getInstance()
        TimePickerDialog(this, { _, hour, minute -> target.setText(String.format(Locale.US, "%02d:%02d", hour, minute)) }, current.get(Calendar.HOUR_OF_DAY), current.get(Calendar.MINUTE), true).show()
    }

    private fun saveEntry() {
        val title = titleInput.text.toString().trim()
        if (title.isBlank() || dateInput.text.isNullOrBlank() || startInput.text.isNullOrBlank() || endInput.text.isNullOrBlank()) {
            status.text = "请填写标题、日期、开始和结束时间"
            return
        }
        val id = selectedId
        if (id == null) repository.create(title, dateInput.text.toString(), startInput.text.toString(), endInput.text.toString(), locationInput.text.toString(), notesInput.text.toString())
        else repository.update(id, title, dateInput.text.toString(), startInput.text.toString(), endInput.text.toString(), locationInput.text.toString(), notesInput.text.toString())
        status.text = if (id == null) "已新建日程" else "已更新日程"
        clearEditor()
        refreshList()
    }

    private fun deleteSelected() {
        val id = selectedId ?: run { status.text = "先从列表选择一条日程"; return }
        if (repository.delete(id)) {
            status.text = "已删除日程"
            clearEditor()
            refreshList()
        }
    }

    private fun clearEditor() {
        selectedId = null
        titleInput.text.clear(); dateInput.text.clear(); startInput.text.clear(); endInput.text.clear(); locationInput.text.clear(); notesInput.text.clear()
    }

    private fun refreshList() {
        if (!::list.isInitialized) return
        list.removeAllViews()
        val entries = repository.list()
        if (entries.isEmpty()) {
            list.addView(TextView(this).apply { text = "还没有日程。"; setTextColor(Color.GRAY); setPadding(0, 8, 0, 8) })
            return
        }
        entries.forEach { entry ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(18, 14, 18, 14)
                setBackgroundColor(Color.WHITE)
                layoutParams = LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT).apply { setMargins(0, 0, 0, 10) }
            }
            card.addView(TextView(this).apply { text = (if (entry.kind == "todo") (if (entry.completed) "✓ " else "□ ") else "") + entry.title; textSize = 18f; setTextColor(Color.rgb(27, 50, 39)) })
            card.addView(TextView(this).apply {
                text = listOf("${entry.date}  ${entry.startTime}-${entry.endTime}", entry.location, entry.notes).filter { it.isNotBlank() }.joinToString(" · ")
                setTextColor(Color.DKGRAY)
                setPadding(0, 5, 0, 8)
            })
            if (entry.kind == "todo") {
                card.addView(Button(this).apply { text = if (entry.completed) "已完成" else "标为完成"; isEnabled = !entry.completed
                    setOnClickListener { repository.complete(entry.id); refreshList() } })
            } else card.addView(Button(this).apply { text = "编辑这条"; setOnClickListener { select(entry) } })
            list.addView(card)
        }
    }

    private fun select(entry: CalendarEntry) {
        selectedId = entry.id
        titleInput.setText(entry.title); dateInput.setText(entry.date); startInput.setText(entry.startTime); endInput.setText(entry.endTime); locationInput.setText(entry.location); notesInput.setText(entry.notes)
        status.text = "正在编辑：${entry.title}"
    }
}
