package com.example.agenriod

import com.example.agenriod.ui.insertShortcut
import com.example.agenriod.ui.shortcutWord
import org.junit.Assert.*
import org.junit.Test

class ComposerShortcutsTest {
    @Test fun queryUsesCursorBeforeTrailingSpace() {
        assertEquals("@", shortcutWord("@ ", 1)?.query)
        assertNull(shortcutWord("@ ", 2))
    }

    @Test fun completionReplacesOnlyTheWordAtCursor() {
        val text = "Use @work and keep this"
        val word = requireNotNull(shortcutWord(text, 8))
        val result = insertShortcut(text, word, "@workspace-info")
        assertEquals("Use @workspace-info and keep this", result.text)
        assertEquals("Use @workspace-info ".length, result.cursor)
    }

    @Test fun slashCompletionPreservesTheTask() {
        val result = insertShortcut("/re check files", requireNotNull(shortcutWord("/re check files", 3)), "/review")
        assertEquals("/review check files", result.text)
    }
}
