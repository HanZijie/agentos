package com.example.agenriod.agent

import android.content.Context
import java.io.File

/** Discovers SKILL.md files; workspace versions override the bundled starters. */
class SkillCatalog(private val context: Context) {
    fun load(): List<SkillDefinition> {
        val result = linkedMapOf<String, SkillDefinition>()
        context.assets.list("skills").orEmpty().sorted().forEach { directory ->
            runCatching { context.assets.open("skills/$directory/SKILL.md").bufferedReader().use { it.readText() } }
                .getOrNull()?.let { parse(it, directory) }?.let { result[it.name] = it }
        }
        listOf(File(context.filesDir, "skills"), File(context.filesDir, "workspace/.pi/skills")).forEach { root ->
            if (root.isDirectory) root.walkTopDown().maxDepth(3).filter { it.name == "SKILL.md" && it.isFile }.forEach { file ->
                runCatching { parse(file.readText(), file.parentFile?.name ?: "skill") }.getOrNull()?.let { result[it.name] = it }
            }
        }
        return result.values.sortedBy { it.name }
    }

    private fun parse(source: String, fallbackName: String): SkillDefinition? {
        val normalized = source.replace("\r\n", "\n")
        val parts = normalized.split("---", limit = 3)
        val hasHeader = normalized.startsWith("---\n") && parts.size == 3
        val metadata = if (hasHeader) parts[1].lineSequence().mapNotNull { line ->
            if (!line.contains(':')) null else line.substringBefore(':').trim() to line.substringAfter(':').trim().trim('"', '\'')
        }.toMap() else emptyMap()
        val name = metadata["name"] ?: fallbackName
        if (!name.matches(Regex("[A-Za-z0-9_-]+"))) return null
        val body = (if (hasHeader) parts[2] else normalized).trim()
        if (body.isBlank()) return null
        return SkillDefinition(name, metadata["description"] ?: "Workspace skill", body)
    }
}
