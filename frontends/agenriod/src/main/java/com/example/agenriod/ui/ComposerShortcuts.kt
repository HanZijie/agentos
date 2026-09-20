package com.example.agenriod.ui

data class ShortcutWord(val start: Int, val end: Int, val query: String)
data class ShortcutInsertion(val text: String, val cursor: Int)

fun shortcutWord(text: String, cursor: Int): ShortcutWord? {
    val position = cursor.coerceIn(0, text.length)
    val start = text.take(position).indexOfLast { it.isWhitespace() } + 1
    val query = text.substring(start, position)
    if (!query.startsWith('@') && !query.startsWith('/')) return null
    val end = (position until text.length).firstOrNull { text[it].isWhitespace() } ?: text.length
    return ShortcutWord(start, end, query)
}

fun insertShortcut(text: String, word: ShortcutWord, token: String): ShortcutInsertion {
    val prefix = text.substring(0, word.start)
    val suffix = text.substring(word.end).trimStart()
    return ShortcutInsertion(prefix + token + " " + suffix, prefix.length + token.length + 1)
}
