# Legacy Agenriod runtime reference

This document describes the embedded QuickJS runtime kept in `frontends/agenriod` during migration. It is not the target system host. The target Agent runtime belongs in `system/agent/sideagentd` and is consumed through Agent Bus by frontends.

Agenriod runs the upstream `@earendil-works/pi-agent-core` `Agent` loop in a
QuickJS runtime embedded in the APK. Compose is the UI; Kotlin is the host
capability layer. Keeping those boundaries means the transcript, tool-call
validation, steering, abort handling and lifecycle events use Pi's runtime
contracts while Android owns capabilities that cannot be provided by Node.

## Model configuration

Open **Settings** from the model chip. The app supports:

- OpenAI-compatible `POST /chat/completions` endpoints, including local BYOK
  gateways. Hosted endpoints should use HTTPS.
- Anthropic `POST /messages` endpoints with text and base64 image content.
- An API key, model id, max-token default, and a system prompt. The key is
  stored in the Android Keystore-backed app preferences and is sent only to the configured
  endpoint when a prompt is run.
- The image button in the composer. Images are passed through Pi's user
  message content blocks, and image files returned by `read` are passed back
  as tool-result image blocks.

The HTTP adapter currently uses non-streaming provider responses and converts
them into Pi `AssistantMessageEventStream` lifecycle events. This preserves the
agent loop and tool recursion while keeping the Android bridge small; token
streaming can be added without changing the UI or tools.

## Built-in tools

The bundled tool set is `read`, `write`, `edit`, `grep`, `find`, `ls`, and
`bash`. File tools are confined to the app-private `files/workspace` directory
and reject normalized paths that escape it. `read` recognizes common image
types and returns base64 attachments. `grep` supports regex/literal mode,
case-insensitive matching, globs, context lines, and a match limit.

Android does not ship a GNU Bash binary. The first implementation executes
commands with `/system/bin/sh`; the command interface is bash-compatible for
common scripts and returns combined output with a timeout. A future ABI-bundled
Bash can replace this host method without changing the Agent tool contract.

## Hooks

Enter one command per line in Settings:

```text
before_tool|echo "$AGENT_TOOL" >> hook.log
after_tool|echo "$AGENT_EVENT $AGENT_TOOL" >> hook.log
```

The host exports `AGENT_EVENT`, `AGENT_TOOL`, and `AGENT_ARGS_JSON`. A failing
`before_tool` command blocks execution; `after_tool` is observational.

## Plugins

The plugin editor installs a JSON manifest into the app-private `plugins`
directory. A manifest adds tools to the next Pi runtime configuration:

```json
{
  "id": "workspace-stats",
  "name": "Workspace stats",
  "tools": [
    {
      "name": "count-lines",
      "description": "Count lines in the workspace",
      "parameters": {"type":"object","properties":{}},
      "command": "find . -type f | wc -l"
    }
  ]
}
```

Plugin commands run in the same workspace with `PLUGIN_ARGS_JSON` and
`AGENT_WORKSPACE` environment variables. Plugin ids and manifest locations are
validated before execution. The current UI installs one manifest at a time;
existing manifests remain available and can be replaced by saving the same id.

## Chat shortcuts and settings

Type `@` at the start of a composer token to select an installed plugin. The
suggestion shows its display name and inserts its stable id. The selected
plugin is named in the Agent request; the original shortcut remains visible
in the chat transcript.

Type `/` to choose a skill. Starter skills (`review`, `explain`, `test`,
`refactor`, `summarize`) are bundled as `SKILL.md` files. The catalog also
discovers `files/skills/*/SKILL.md` and
`files/workspace/.pi/skills/*/SKILL.md`; local definitions override starter
skills by name. A skill's body is expanded into the Agent prompt on send.

Plugin installation and removal live in **Settings → Plugins**. Model and Hook
configuration have separate settings tabs. The microphone button uses Android
SpeechRecognizer and shows listening/transcription status inside the composer.
It requires a speech recognition service and microphone permission.

The composer stays on one line, with a 48dp bar and three 40dp icon buttons.
It uses a normal text keyboard with Chinese/English locale hints, retaining the
IME composing range while Pinyin is being converted to Chinese. Sending is
disabled until that composing text is committed. The microphone requests
Mandarin (`zh-CN`); Chinese keyboard selection remains a system input-method
setting.

## Sessions

The Sessions page supports create, switch, rename, and delete. Session files
under `files/sessions` contain the UI transcript and original Pi messages,
including tool call/result pairs and image content. Switching restores those
messages into the real Pi Agent, so its context follows the selected session.
Late events carry a session id and cannot write into a different session.
The controller is retained by a ViewModel across Activity recreation.
