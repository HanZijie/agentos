package com.example.agenriod.agent

import android.content.Context
import android.util.Base64
import com.dokar.quickjs.QuickJs
import com.dokar.quickjs.binding.asyncFunction
import com.dokar.quickjs.binding.function
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.Locale
import java.util.UUID
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern
import kotlin.io.path.isDirectory

/** Host-side capabilities exposed to the bundled pi-agent-core runtime. */
class NativeAgentBridge(
    private val appContext: Context,
    private val configProvider: () -> ModelConfig,
    private val hooksProvider: () -> String,
    private val onEvent: (String) -> Unit,
) {
    private val workspace: Path = appContext.filesDir.toPath().resolve("workspace").also { Files.createDirectories(it) }
    private val externalPlugins = AndroidPluginRegistry(appContext)
    private val localMcp = LocalMcpRegistry()
    private val pluginsDir: Path = appContext.filesDir.toPath().resolve("plugins").also { Files.createDirectories(it) }
    @Volatile private var activeConnection: HttpURLConnection? = null
    @Volatile private var activeProcess: Process? = null

    fun cancelActiveOperations() {
        runCatching { activeConnection?.disconnect() }
        runCatching { activeProcess?.destroyForcibly() }
    }

    fun installPluginManifest(manifest: String): Result<String> = runCatching {
        val json = JSONObject(manifest)
        val id = json.optString("id").ifBlank { UUID.randomUUID().toString() }
        localMcp.validate(json)
        require(id.matches(Regex("[A-Za-z0-9._-]+"))) { "Plugin id may contain only letters, digits, '.', '_' and '-'" }
        val file = pluginsDir.resolve("$id.json").normalize()
        require(file.parent == pluginsDir) { "Invalid plugin path" }
        file.toFile().writeText(json.put("id", id).toString(2))
        id
    }

    fun pluginManifestText(): String = Files.list(pluginsDir).use { stream ->
        stream.filter { it.toString().endsWith(".json") }.findFirst().map { it.toFile().readText() }.orElse("")
    }

    fun refreshExternalPlugins() = externalPlugins.refresh()
    val pluginChanges get() = externalPlugins.changes

    fun listPlugins(): List<JSONObject> = pluginCatalog().filter { it.optBoolean("active", true) }

    fun pluginCatalog(): List<JSONObject> {
        val local = runCatching {
            Files.list(pluginsDir).use { stream -> stream.filter { it.toString().endsWith(".json") }.iterator().asSequence().toList()
                .mapNotNull { file -> runCatching { JSONObject(file.toFile().readText()) }.getOrNull() } }
        }.getOrDefault(emptyList())
        val localDescriptors = runCatching { localMcp.refresh(local) }.getOrDefault(local)
        return (localDescriptors.filterNot { externalPlugins.has(it.optString("id")) } + externalPlugins.catalog()).distinctBy { it.optString("id") }
    }

    fun systemPromptContext(): String {
        val local = localMcp.promptSummary()
        val external = externalPlugins.promptSummary()
        val addresses = listOf(local, external).filter { it.isNotBlank() }.joinToString("\n")
        return "MCP configuration: Plugin manifests declare mcpServers with transport=streamable-http and a URL; the Host exposes discovered MCP tools by name and sends calls to the configured server. Authentication headers are hidden from this prompt.\n" +
            if (addresses.isBlank()) "No MCP server is currently configured." else "Configured MCP server addresses:\n$addresses"
    }

    private fun effectiveSystemPrompt(config: ModelConfig): String = listOf(config.systemPrompt, systemPromptContext())
        .filter { it.isNotBlank() }.joinToString("\n\n")

    fun deletePlugin(id: String): Boolean = runCatching {
        require(id.matches(Regex("[A-Za-z0-9._-]+"))) { "Invalid plugin id" }
        pluginsDir.resolve("$id.json").normalize().toFile().delete()
    }.getOrDefault(false)

    fun defineBindings(quickJs: QuickJs) {
        quickJs.function<String>("__agenriod_call") { args ->
            val method = args.getOrNull(0)?.toString() ?: ""
            val payload = args.getOrNull(1)?.toString() ?: "{}"
            callSync(method, payload)
        }
        quickJs.asyncFunction<String>("__agenriod_call_async") { args ->
            val method = args.getOrNull(0)?.toString() ?: ""
            val payload = args.getOrNull(1)?.toString() ?: "{}"
            withContext(Dispatchers.IO) { callAsync(method, payload) }
        }
    }

    private fun callSync(method: String, payload: String): String = when (method) {
        "event" -> {
            onEvent(payload)
            "{}"
        }
        "plugins" -> pluginsJson()
        "hook" -> hook(JSONObject(payload))
        else -> callAsync(method, payload)
    }

    private fun callAsync(method: String, payload: String): String = when (method) {
        "event" -> { onEvent(payload); "{}" }
        "plugins" -> pluginsJson()
        "hook" -> hook(JSONObject(payload))
        "read" -> read(JSONObject(payload))
        "write" -> write(JSONObject(payload))
        "edit" -> edit(JSONObject(payload))
        "grep" -> grep(JSONObject(payload))
        "find" -> find(JSONObject(payload))
        "ls" -> ls(JSONObject(payload))
        "bash" -> bash(JSONObject(payload))
        "complete" -> complete(JSONObject(payload))
        "plugin" -> plugin(JSONObject(payload))
        else -> error("Unknown native method: $method")
    }

    private fun result(text: String, details: JSONObject? = null): String = JSONObject().apply {
        put("text", text)
        if (details != null) put("details", details)
    }.toString()

    private fun error(message: String): Nothing = throw IllegalStateException(message)

    private fun resolve(raw: String?): Path {
        val input = raw.orEmpty().ifBlank { "." }
        val candidate = if (Paths.get(input).isAbsolute) Paths.get(input).normalize() else workspace.resolve(input).normalize()
        require(candidate.startsWith(workspace)) { "Path escapes the workspace" }
        return candidate
    }

    private fun imageMime(path: Path): String? = when (path.toString().substringAfterLast('.', "").lowercase(Locale.US)) {
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "gif" -> "image/gif"
        "webp" -> "image/webp"
        "bmp" -> "image/bmp"
        else -> null
    }

    private fun read(input: JSONObject): String {
        val path = resolve(input.optString("path"))
        require(Files.exists(path)) { "File not found: ${input.optString("path")}" }
        val bytes = Files.readAllBytes(path)
        val mime = imageMime(path)
        if (mime != null) {
            val image = JSONObject().put("type", "image").put("data", Base64.encodeToString(bytes, Base64.NO_WRAP)).put("mimeType", mime)
            return JSONObject().put("text", "Read image file [$mime]").put("image", image).toString()
        }
        val lines = String(bytes, StandardCharsets.UTF_8).split("\n")
        val offset = input.optInt("offset", 1).coerceAtLeast(1)
        require(offset <= lines.size) { "Offset $offset is beyond end of file (${lines.size} lines total)" }
        val limit = if (input.has("limit")) input.optInt("limit").coerceAtLeast(1) else 2000
        val end = (offset - 1 + limit).coerceAtMost(lines.size)
        var text = lines.subList(offset - 1, end).joinToString("\n")
        if (end < lines.size) text += "\n\n[Showing lines $offset-$end of ${lines.size}. Use offset=${end + 1} to continue.]"
        if (text.toByteArray(StandardCharsets.UTF_8).size > 50 * 1024) {
            text = String(text.toByteArray(StandardCharsets.UTF_8).copyOf(50 * 1024), StandardCharsets.UTF_8) + "\n\n[Output truncated at 50KB]"
        }
        return result(text)
    }

    private fun write(input: JSONObject): String {
        val path = resolve(input.optString("path"))
        Files.createDirectories(path.parent)
        path.toFile().writeText(input.optString("content"))
        return result("Successfully wrote to ${input.optString("path")}")
    }

    private fun edit(input: JSONObject): String {
        val path = resolve(input.optString("path"))
        require(Files.exists(path)) { "File not found: ${input.optString("path")}" }
        val oldText = input.optString("oldText")
        val content = path.toFile().readText()
        val count = content.windowed(oldText.length.coerceAtLeast(1), 1).count { it == oldText }
        require(count == 1) { "Expected exactly one occurrence of oldText, found $count" }
        path.toFile().writeText(content.replace(oldText, input.optString("newText")))
        return result("Successfully edited ${input.optString("path")}")
    }

    private fun grep(input: JSONObject): String {
        val root = resolve(input.optString("path", "."))
        require(Files.exists(root)) { "Path not found: $root" }
        val raw = input.optString("pattern")
        require(raw.isNotBlank()) { "grep: pattern is required" }
        val regex = if (input.optBoolean("literal", false)) Pattern.quote(raw) else raw
        val pattern = runCatching { Pattern.compile(regex, if (input.optBoolean("ignoreCase")) Pattern.CASE_INSENSITIVE else 0) }
            .getOrElse { error("grep: invalid regex: ${it.message}") }
        val limit = input.optInt("limit", 100).coerceAtLeast(1)
        val context = input.optInt("context", 0).coerceAtLeast(0)
        val glob = input.optString("glob", "").takeIf { it.isNotBlank() }
        val output = mutableListOf<String>()
        var matches = 0
        val files = if (Files.isRegularFile(root)) sequenceOf(root) else Files.walk(root).use { it.iterator().asSequence().filter { file -> Files.isRegularFile(file) }.toList().asSequence() }
        for (file in files) {
            if (matches >= limit) break
            val relative = root.relativize(file).toString().replace(File.separatorChar, '/')
            if (glob != null && !globMatch(relative, glob)) continue
            val lines = runCatching { Files.readAllLines(file) }.getOrElse { continue }
            for (index in lines.indices) {
                if (matches >= limit) break
                if (!pattern.matcher(lines[index]).find()) continue
                matches++
                val start = (index - context).coerceAtLeast(0)
                val end = (index + context).coerceAtMost(lines.lastIndex)
                for (lineIndex in start..end) {
                    val marker = if (lineIndex == index) ":" else "-"
                    output += "$relative${marker}${lineIndex + 1}${marker} ${lines[lineIndex].take(500)}"
                }
            }
        }
        if (output.isEmpty()) return result("No matches found")
        var text = output.joinToString("\n")
        if (matches >= limit) text += "\n\n[$limit matches limit reached]"
        return result(text)
    }

    private fun find(input: JSONObject): String {
        val root = resolve(input.optString("path", "."))
        val pattern = input.optString("pattern", "").takeIf { it.isNotBlank() }
        val limit = input.optInt("limit", 500).coerceAtLeast(1)
        val results = Files.walk(root).use { stream ->
            stream.filter { it != root }.filter { pattern == null || globMatch(root.relativize(it).toString(), pattern) }
                .limit(limit.toLong()).map { root.relativize(it).toString().replace(File.separatorChar, '/') }.iterator().asSequence().toList()
        }
        return result(if (results.isEmpty()) "No files found" else results.joinToString("\n"))
    }

    private fun ls(input: JSONObject): String {
        val path = resolve(input.optString("path", "."))
        require(Files.isDirectory(path)) { "Not a directory: $path" }
        val entries = Files.list(path).use { stream -> stream.sorted().map { item ->
            val suffix = if (Files.isDirectory(item)) "/" else ""
            item.fileName.toString() + suffix
        }.iterator().asSequence().toList() }
        return result(if (entries.isEmpty()) "(empty)" else entries.joinToString("\n"))
    }

    private fun bash(input: JSONObject): String = result(runCommand(input.optString("command"), input.optLong("timeout", 120).coerceAtLeast(1), emptyMap()))

    private fun runCommand(command: String, timeoutSeconds: Long, environment: Map<String, String>): String {
        require(command.isNotBlank()) { "Command is empty" }
        val process = ProcessBuilder("/system/bin/sh", "-c", command).directory(workspace.toFile()).redirectErrorStream(true).apply {
            environment().putAll(environment)
            environment()["HOME"] = appContext.filesDir.absolutePath
            environment()["PWD"] = workspace.toString()
        }.start()
        activeProcess = process
        try {
            val finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS)
            if (!finished) {
                process.destroyForcibly()
                error("Command timed out after $timeoutSeconds seconds")
            }
            val output = process.inputStream.bufferedReader().use { it.readText() }.takeLast(50 * 1024)
            if (process.exitValue() != 0) error("${output}\n\nCommand exited with code ${process.exitValue()}")
            return output.ifBlank { "(no output)" }
        } finally {
            activeProcess = null
        }
    }

    private fun globMatch(value: String, glob: String): Boolean {
        val source = glob.replace('\\', '/')
        val regex = buildString {
            var index = 0
            while (index < source.length) {
                when (val character = source[index]) {
                    '*' -> if (index + 1 < source.length && source[index + 1] == '*') { append(".*"); index++ } else append("[^/]*")
                    '?' -> append('.')
                    '.' -> append("\\.")
                    else -> append(Regex.escape(character.toString()))
                }
                index++
            }
        }
        return Regex("^$regex$").matches(value.replace('\\', '/'))
    }

    private fun pluginsJson(): String = JSONArray().apply { listPlugins().forEach { put(it) } }.toString()

    private fun plugin(input: JSONObject): String {
        val id = input.optString("pluginId")
        require(id.matches(Regex("[A-Za-z0-9._-]+"))) { "Invalid plugin id" }
        if (externalPlugins.has(id)) {
            val response = JSONObject(externalPlugins.invoke(id, input.optString("tool"), input.optJSONObject("args") ?: JSONObject()))
            return if (response.has("content")) response.toString() else result(response.toString())
        }
        localMcp.invoke(id, input.optString("tool"), input.optJSONObject("args") ?: JSONObject())?.let { return it }
        val file = pluginsDir.resolve("$id.json")
        require(Files.exists(file)) { "Plugin not found: $id" }
        val manifest = JSONObject(file.toFile().readText())
        val toolName = input.optString("tool")
        val definitions = manifest.optJSONArray("tools") ?: JSONArray()
        val definition = (0 until definitions.length())
            .map { definitions.getJSONObject(it) }.firstOrNull { it.optString("name") == toolName }
            ?: error("Plugin tool not found: $toolName")
        val command = definition.optString("command")
        require(command.isNotBlank()) { "Plugin tool command is empty" }
        val args = input.optJSONObject("args")?.toString() ?: "{}"
        return result(runCommand(command, 120, mapOf("PLUGIN_ARGS_JSON" to args, "AGENT_WORKSPACE" to workspace.toString())))
    }

    private fun hook(input: JSONObject): String {
        val event = input.optString("event")
        val tool = input.optString("tool")
        val args = input.optJSONObject("args")?.toString() ?: input.opt("result")?.toString() ?: "{}"
        val hooks = hooksProvider().lineSequence().map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("#") }.mapNotNull { line ->
            val separator = line.indexOf('|').takeIf { it > 0 } ?: line.indexOf('=').takeIf { it > 0 }
            separator?.let { line.substring(0, it).trim() to line.substring(it + 1).trim() }
        }.filter { it.first == event || it.first == "*" }.toList()
        for ((_, command) in hooks) {
            val output = runCatching { runCommand(command, 60, mapOf("AGENT_EVENT" to event, "AGENT_TOOL" to tool, "AGENT_ARGS_JSON" to args)) }
            if (output.isFailure && event == "before_tool") return JSONObject().put("block", true).put("reason", output.exceptionOrNull()?.message ?: "Blocked by hook").toString()
        }
        return "{}"
    }

    private fun complete(input: JSONObject): String {
        val config = configProvider()
        require(config.model.isNotBlank()) { "Model name is empty" }
        require(config.baseUrl.isNotBlank()) { "Endpoint is empty" }
        val model = input.getJSONObject("model")
        val context = input.getJSONObject("context")
        val provider = config.provider.lowercase(Locale.US)
        val isAnthropic = provider == "anthropic" || provider == "claude"
        val isGemini = provider == "gemini" || provider == "google" || provider == "google-gemini"
        val endpoint = when {
            isAnthropic -> normalizeEndpoint(config.baseUrl, "/messages")
            isGemini -> geminiEndpoint(config.baseUrl, model.optString("id", config.model), config.apiKey)
            else -> normalizeEndpoint(config.baseUrl, "/chat/completions")
        }
        val body = when {
            isAnthropic -> anthropicBody(model, context, config)
            isGemini -> geminiBody(model, context, config)
            else -> openAiBody(model, context, config)
        }
        val connection = (URI.create(endpoint).toURL().openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 30_000
            readTimeout = 180_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            if (isAnthropic) {
                setRequestProperty("x-api-key", config.apiKey)
                setRequestProperty("anthropic-version", "2023-06-01")
            } else if (!isGemini && config.apiKey.isNotBlank()) setRequestProperty("Authorization", "Bearer ${config.apiKey}")
        }
        activeConnection = connection
        try {
            connection.outputStream.use { it.write(body.toString().toByteArray(StandardCharsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status !in 200..299) error("Model request failed ($status): ${raw.take(1000)}")
            return parseCompletion(raw, isAnthropic, isGemini).toString()
        } finally {
            connection.disconnect()
            activeConnection = null
        }
    }

    private fun normalizeEndpoint(base: String, suffix: String): String {
        val clean = base.trim().trimEnd('/')
        return if (clean.endsWith("/chat/completions") || clean.endsWith("/messages")) clean else clean + suffix
    }

    private fun geminiEndpoint(base: String, model: String, apiKey: String): String {
        val clean = base.trim().trimEnd('/')
        val target = if (clean.endsWith(":generateContent")) clean else "$clean/models/$model:generateContent"
        return "$target?key=${java.net.URLEncoder.encode(apiKey, StandardCharsets.UTF_8.name())}"
    }

    private fun openAiBody(model: JSONObject, context: JSONObject, config: ModelConfig): JSONObject = JSONObject().apply {
        put("model", model.optString("id", config.model))
        put("messages", JSONArray().also { messages ->
            if (effectiveSystemPrompt(config).isNotBlank()) messages.put(JSONObject().put("role", "system").put("content", effectiveSystemPrompt(config)))
            val converted = openAiMessages(context.getJSONArray("messages"))
            for (index in 0 until converted.length()) messages.put(converted.get(index))
        })
        val modelId = model.optString("id", config.model).lowercase(Locale.US)
        if (modelId.startsWith("gpt-5") || modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.startsWith("o4")) {
            put("max_completion_tokens", config.maxTokens)
        } else {
            put("max_tokens", config.maxTokens)
        }
        put("stream", false)
        val tools = openAiTools(context.optJSONArray("tools"))
        if (tools.length() > 0) put("tools", tools)
    }

    private fun openAiTools(tools: JSONArray?): JSONArray = JSONArray().also { output ->
        for (index in 0 until (tools?.length() ?: 0)) {
            val tool = tools!!.getJSONObject(index)
            output.put(JSONObject().put("type", "function").put("function", JSONObject().put("name", tool.optString("name")).put("description", tool.optString("description")).put("parameters", tool.opt("parametersForModel") ?: tool.opt("parameters"))))
        }
    }

    private fun openAiMessages(messages: JSONArray): JSONArray = JSONArray().also { output ->
        for (index in 0 until messages.length()) {
            val message = messages.getJSONObject(index)
            when (message.optString("role")) {
                "user" -> output.put(JSONObject().put("role", "user").put("content", openAiContent(message.optJSONArray("content"))))
                "assistant" -> {
                    val item = JSONObject().put("role", "assistant").put("content", textFromContent(message.optJSONArray("content")))
                    val calls = JSONArray()
                    for (block in contentBlocks(message.optJSONArray("content"))) if (block.optString("type") == "toolCall") {
                        calls.put(JSONObject().put("id", block.optString("id")).put("type", "function").put("function", JSONObject().put("name", block.optString("name")).put("arguments", block.optJSONObject("arguments")?.toString() ?: "{}")))
                    }
                    if (calls.length() > 0) item.put("tool_calls", calls)
                    output.put(item)
                }
                "toolResult" -> output.put(JSONObject().put("role", "tool").put("tool_call_id", message.optString("toolCallId")).put("content", textFromContent(message.optJSONArray("content"))))
            }
        }
    }

    private fun openAiContent(content: JSONArray?): Any = if (content == null || content.length() == 0) "" else if (content.length() == 1 && content.optJSONObject(0)?.optString("type") == "text") content.getJSONObject(0).optString("text") else JSONArray().also { output ->
        for (block in contentBlocks(content)) when (block.optString("type")) {
            "text" -> output.put(JSONObject().put("type", "text").put("text", block.optString("text")))
            "image" -> output.put(JSONObject().put("type", "image_url").put("image_url", JSONObject().put("url", "data:${block.optString("mimeType")};base64,${block.optString("data")}")))
        }
    }

    private fun anthropicContent(content: JSONArray?): Any = if (content == null || content.length() == 0) "" else if (content.length() == 1 && content.optJSONObject(0)?.optString("type") == "text") content.getJSONObject(0).optString("text") else JSONArray().also { output ->
        for (block in contentBlocks(content)) when (block.optString("type")) {
            "text" -> output.put(JSONObject().put("type", "text").put("text", block.optString("text")))
            "image" -> output.put(JSONObject().put("type", "image").put("source", JSONObject().put("type", "base64").put("media_type", block.optString("mimeType")).put("data", block.optString("data"))))
            "toolCall" -> output.put(JSONObject().put("type", "tool_use").put("id", block.optString("id")).put("name", block.optString("name")).put("input", block.optJSONObject("arguments") ?: JSONObject()))
        }
    }

    private fun anthropicBody(model: JSONObject, context: JSONObject, config: ModelConfig): JSONObject = JSONObject().apply {
        put("model", model.optString("id", config.model))
        put("max_tokens", config.maxTokens)
        put("messages", anthropicMessages(context.getJSONArray("messages")))
        if (effectiveSystemPrompt(config).isNotBlank()) put("system", effectiveSystemPrompt(config))
        val tools = context.optJSONArray("tools")
        if (tools != null && tools.length() > 0) put("tools", JSONArray().also { out -> for (i in 0 until tools.length()) { val t = tools.getJSONObject(i); out.put(JSONObject().put("name", t.optString("name")).put("description", t.optString("description")).put("input_schema", t.opt("parametersForModel") ?: t.opt("parameters"))) } })
    }

    private fun anthropicMessages(messages: JSONArray): JSONArray = JSONArray().also { output ->
        for (index in 0 until messages.length()) {
            val message = messages.getJSONObject(index)
            val role = message.optString("role")
            if (role == "user" || role == "assistant") output.put(JSONObject().put("role", role).put("content", anthropicContent(message.optJSONArray("content"))))
            else if (role == "toolResult") output.put(JSONObject().put("role", "user").put("content", JSONArray().put(JSONObject().put("type", "tool_result").put("tool_use_id", message.optString("toolCallId")).put("content", textFromContent(message.optJSONArray("content"))))))
        }
    }

    private fun geminiBody(model: JSONObject, context: JSONObject, config: ModelConfig): JSONObject = JSONObject().apply {
        put("contents", geminiMessages(context.getJSONArray("messages")))
        if (effectiveSystemPrompt(config).isNotBlank()) put("systemInstruction", JSONObject().put("parts", JSONArray().put(JSONObject().put("text", effectiveSystemPrompt(config)))))
        put("generationConfig", JSONObject().put("maxOutputTokens", config.maxTokens))
        val tools = context.optJSONArray("tools")
        if (tools != null && tools.length() > 0) put("tools", JSONArray().put(JSONObject().put("functionDeclarations", JSONArray().also { declarations ->
            for (i in 0 until tools.length()) {
                val item = tools.getJSONObject(i)
                declarations.put(JSONObject().put("name", item.optString("name")).put("description", item.optString("description")).put("parameters", item.opt("parametersForModel") ?: item.opt("parameters")))
            }
        })))
    }

    private fun geminiMessages(messages: JSONArray): JSONArray = JSONArray().also { output ->
        for (index in 0 until messages.length()) {
            val message = messages.getJSONObject(index)
            when (message.optString("role")) {
                "user" -> output.put(JSONObject().put("role", "user").put("parts", geminiParts(message.optJSONArray("content"))))
                "assistant" -> output.put(JSONObject().put("role", "model").put("parts", geminiParts(message.optJSONArray("content"))))
                "toolResult" -> output.put(JSONObject().put("role", "user").put("parts", JSONArray().put(JSONObject().put("functionResponse", JSONObject().put("name", message.optString("toolName")).put("response", JSONObject().put("result", textFromContent(message.optJSONArray("content"))))))))
            }
        }
    }

    private fun geminiParts(content: JSONArray?): JSONArray = JSONArray().also { output ->
        for (block in contentBlocks(content)) when (block.optString("type")) {
            "text" -> output.put(JSONObject().put("text", block.optString("text")))
            "image" -> output.put(JSONObject().put("inlineData", JSONObject().put("mimeType", block.optString("mimeType")).put("data", block.optString("data"))))
            "toolCall" -> output.put(JSONObject().put("functionCall", JSONObject().put("name", block.optString("name")).put("args", block.optJSONObject("arguments") ?: JSONObject())))
        }
    }

    private fun parseCompletion(raw: String, anthropic: Boolean, gemini: Boolean): JSONObject {
        val root = JSONObject(raw)
        if (anthropic) {
            val content = root.optJSONArray("content")
            val text = StringBuilder()
            val calls = JSONArray()
            for (i in 0 until (content?.length() ?: 0)) {
                val block = content!!.getJSONObject(i)
                if (block.optString("type") == "text") text.append(block.optString("text"))
                if (block.optString("type") == "tool_use") calls.put(JSONObject().put("id", block.optString("id")).put("name", block.optString("name")).put("arguments", block.optJSONObject("input") ?: JSONObject()))
            }
            return JSONObject().put("text", text.toString()).put("toolCalls", calls).put("stopReason", if (calls.length() > 0) "toolUse" else "stop")
        }
        if (gemini) {
            val parts = root.optJSONArray("candidates")?.optJSONObject(0)?.optJSONObject("content")?.optJSONArray("parts")
            val text = StringBuilder()
            val calls = JSONArray()
            for (i in 0 until (parts?.length() ?: 0)) {
                val part = parts!!.getJSONObject(i)
                text.append(part.optString("text", ""))
                val function = part.optJSONObject("functionCall")
                if (function != null) calls.put(JSONObject().put("id", "gemini-${i + 1}").put("name", function.optString("name")).put("arguments", function.optJSONObject("args") ?: JSONObject()))
            }
            val usage = root.optJSONObject("usageMetadata")
            return JSONObject().put("text", text.toString()).put("toolCalls", calls).put("stopReason", if (calls.length() > 0) "toolUse" else "stop").put("usage", JSONObject().put("input", usage?.optInt("promptTokenCount", 0) ?: 0).put("output", usage?.optInt("candidatesTokenCount", 0) ?: 0).put("totalTokens", usage?.optInt("totalTokenCount", 0) ?: 0).put("cacheRead", 0).put("cacheWrite", 0))
        }
        val choice = root.optJSONArray("choices")?.optJSONObject(0) ?: error("Model response did not contain choices")
        val message = choice.optJSONObject("message") ?: error("Model response did not contain a message")
        val calls = JSONArray()
        val toolCalls = message.optJSONArray("tool_calls")
        for (i in 0 until (toolCalls?.length() ?: 0)) {
            val call = toolCalls!!.getJSONObject(i); val fn = call.optJSONObject("function")
            val args = runCatching { JSONObject(fn?.optString("arguments", "{}") ?: "{}") }.getOrDefault(JSONObject())
            calls.put(JSONObject().put("id", call.optString("id")).put("name", fn?.optString("name")).put("arguments", args))
        }
        val usage = root.optJSONObject("usage")
        val usageJson = JSONObject().put("input", usage?.optInt("prompt_tokens", 0) ?: 0).put("output", usage?.optInt("completion_tokens", 0) ?: 0).put("totalTokens", usage?.optInt("total_tokens", 0) ?: 0).put("cacheRead", 0).put("cacheWrite", 0)
        return JSONObject().put("text", textFromOpenAi(message.opt("content"))).put("toolCalls", calls).put("stopReason", if (calls.length() > 0) "toolUse" else "stop").put("usage", usageJson)
    }

    private fun textFromOpenAi(value: Any?): String = when (value) {
        is String -> value
        is JSONArray -> (0 until value.length()).joinToString("") { value.optJSONObject(it)?.optString("text", "") ?: "" }
        else -> ""
    }

    private fun contentBlocks(content: JSONArray?): List<JSONObject> = (0 until (content?.length() ?: 0)).mapNotNull { content?.optJSONObject(it) }
    private fun textFromContent(content: JSONArray?): String = contentBlocks(content).filter { it.optString("type") == "text" }.joinToString("\n") { it.optString("text") }
}
