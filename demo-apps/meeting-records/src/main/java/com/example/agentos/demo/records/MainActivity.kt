package com.example.agentos.demo.records

import android.app.Activity
import android.app.DatePickerDialog
import android.os.Bundle
import android.graphics.Color
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var repository: RecordsRepository
    private lateinit var titleInput: EditText
    private lateinit var timeInput: EditText
    private lateinit var bodyInput: EditText
    private lateinit var searchInput: EditText
    private lateinit var list: LinearLayout
    private lateinit var status: TextView
    private var selectedId: String? = null

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        repository = (application as RecordsApplication).repository
        setContentView(buildScreen())
        refresh()
    }

    private fun buildScreen(): View {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 32)
            setBackgroundColor(Color.rgb(248, 249, 252))
        }
        content.addView(TextView(this).apply {
            text = "会议纪要"
            textSize = 28f
            setTextColor(Color.rgb(27, 34, 48))
        })
        content.addView(TextView(this).apply {
            text = "记录、编辑和回看会议决定"
            textSize = 15f
            setTextColor(Color.DKGRAY)
            setPadding(0, 4, 0, 18)
        })
        status = TextView(this).apply {
            setTextColor(Color.rgb(35, 103, 75))
            setPadding(0, 0, 0, 8)
        }
        content.addView(status)

        searchInput = field("搜索标题、正文或时间").also { input ->
            input.addTextChangedListener(SimpleTextWatcher { refreshList() })
            content.addView(input)
        }
        titleInput = field("会议主题")
        timeInput = field("会议日期（可选）").apply {
            inputType = InputType.TYPE_CLASS_DATETIME
            isFocusable = false
            setOnClickListener { chooseDate() }
        }
        bodyInput = field("纪要内容").apply {
            minLines = 6
            gravity = Gravity.TOP
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
        }
        content.addView(titleInput)
        content.addView(timeInput)
        content.addView(bodyInput)

        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        actions.addView(button("保存") { saveRecord() }, weight = 1f)
        actions.addView(button("清空") { clearEditor() }, weight = 1f)
        actions.addView(button("删除") { deleteSelected() }, weight = 1f)
        content.addView(actions)

        content.addView(TextView(this).apply {
            text = "已有纪要"
            textSize = 19f
            setTextColor(Color.rgb(27, 34, 48))
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
        val calendar = Calendar.getInstance()
        DatePickerDialog(this, { _, year, month, day ->
            timeInput.setText(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().apply {
                set(year, month, day)
            }.time))
        }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show()
    }

    private fun saveRecord() {
        val title = titleInput.text.toString().trim()
        val body = bodyInput.text.toString().trim()
        if (title.isBlank() || body.isBlank()) {
            status.text = "请先填写主题和纪要内容"
            return
        }
        val id = selectedId
        if (id == null) repository.create(title, body, timeInput.text.toString())
        else repository.update(id, title, body, timeInput.text.toString())
        status.text = if (id == null) "已新建纪要" else "已更新纪要"
        clearEditor()
        refreshList()
    }

    private fun deleteSelected() {
        val id = selectedId ?: run {
            status.text = "先从列表选择一条纪要"
            return
        }
        if (repository.delete(id)) {
            status.text = "已删除纪要"
            clearEditor()
            refreshList()
        }
    }

    private fun clearEditor() {
        selectedId = null
        titleInput.text.clear()
        timeInput.text.clear()
        bodyInput.text.clear()
    }

    private fun refresh() {
        refreshList()
        status.text = "Plugin：打开 AgentOS 后可用"
    }

    private fun refreshList() {
        if (!::list.isInitialized) return
        list.removeAllViews()
        val records = repository.list(searchInput.text.toString())
        if (records.isEmpty()) {
            list.addView(TextView(this).apply { text = "还没有纪要，先写下第一条。"; setTextColor(Color.GRAY); setPadding(0, 8, 0, 8) })
            return
        }
        records.forEach { record ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(18, 14, 18, 14)
                setBackgroundColor(Color.WHITE)
                layoutParams = LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT).apply { setMargins(0, 0, 0, 10) }
            }
            card.addView(TextView(this).apply { text = record.title; textSize = 18f; setTextColor(Color.rgb(27, 34, 48)) })
            card.addView(TextView(this).apply {
                text = listOf(record.meetingTime, record.body.take(140)).filter { it.isNotBlank() }.joinToString(" · ")
                setTextColor(Color.DKGRAY)
                setPadding(0, 5, 0, 8)
            })
            card.addView(Button(this).apply {
                text = "编辑这条"
                setOnClickListener { select(record) }
            })
            list.addView(card)
        }
    }

    private fun select(record: MeetingRecord) {
        selectedId = record.id
        titleInput.setText(record.title)
        timeInput.setText(record.meetingTime)
        bodyInput.setText(record.body)
        status.text = "正在编辑：${record.title}"
    }
}

private class SimpleTextWatcher(private val changed: () -> Unit) : android.text.TextWatcher {
    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = changed()
    override fun afterTextChanged(s: android.text.Editable?) = Unit
}
