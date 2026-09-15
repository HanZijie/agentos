package com.example.agenriod.notes

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.widget.*
import org.json.JSONObject

/** Tiny editor proves the plugin owns its own app data, independently of Agenriod. */
class MainActivity : Activity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val title = EditText(this).apply { hint = "Title" }
        val body = EditText(this).apply { hint = "Note"; minLines = 5; gravity = Gravity.TOP }
        val save = Button(this).apply { text = "Save note" }
        save.setOnClickListener {
            NotesRepository(this).update("ui-note", title.text.toString(), body.text.toString())
            Toast.makeText(this, "Saved in Notes Plugin", Toast.LENGTH_SHORT).show()
        }
        setContentView(LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 24, 24, 24); addView(title); addView(body); addView(save) })
    }
}
