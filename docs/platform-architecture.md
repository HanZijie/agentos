# Agenriod platform architecture

This document records the Android system integration seam as of the platform migration.

## Agent Host and lifecycle

`AgentHost` is the deep module held by `AgentService`. It owns PiRuntime, session storage, the durable FIFO journal, plugin catalog refresh, and event reduction. `MainActivity` owns no runtime or session object; it binds to the service through `IAgentService` and renders a state snapshot through `AgentClient`.

`AgentService` is an ordinary started and bound service in the `com.example.agenriod:agent` process. It returns `START_STICKY`, so a process restart recreates the Host. The journal at `files/agent-tasks.json` is written with `AtomicFile` before a task starts. Queued tasks resume automatically. Running tasks are marked `interrupted` during recovery and require an explicit Retry; this avoids silently repeating a tool with an external side effect. Retry truncates an incomplete Pi tool-call group before starting a fresh run.

The Binder interface is intentionally small: `command(name,payload)` and a state callback. The app process does not cast a remote binder to a local class. State is JSON because `AgentUiState` contains UI-friendly value objects; this is an internal same-application IPC seam, not a public SDK.

## System assistant

`AgenriodVoiceInteractionService` is the lightweight system-selected interactor. `AgenriodVoiceInteractionSessionService` runs sessions in `:voice_session` and shows a minimal session surface. This enables the assistant gesture and default-assistant selection. It does not register a hotword recognizer and does not keep a microphone open.

Android requires `android.permission.BIND_VOICE_INTERACTION` on both declarations. The platform docs also state that the always-running interactor should stay lightweight and that the session service should be separate; the manifest follows that split. The platform additionally rejects a voice interactor whose metadata lacks `android:recognitionService` ("NOT VALID: No recognitionService specified"), so `AgenriodRecognitionService` exists as a stub that reports `ERROR_CLIENT` and never opens the microphone; real ASR replaces it later.

## Plugin interface

`plugin-api` contains the AIDL contract:

- `describe()` returns a JSON descriptor with a stable plugin id and tool schemas.
- `invoke(tool,argsJson)` executes one tool and returns JSON.

`notes-plugin` is a separately installable APK. Its exported `NotesPluginService` registers `notes.search` and `notes.update`; it stores notes inside its own app data. `AndroidPluginRegistry` discovers the service by intent action and invokes it through the shared AIDL. Existing app-private JSON command manifests remain supported as a local adapter. One implementation note: inside an `AgentPluginService.Stub` subclass, the name `DESCRIPTOR` resolves to the AIDL-generated interface-name constant, so plugin descriptors must use a different constant name (see `PLUGIN_DESCRIPTOR` in the notes plugin). `NotesPluginCrossAppTest` verifies discovery, describe, and invoke across the two APKs on device.

`runtime/plugin-interface.mjs` defines the same descriptor/invoke shape for Node. `runtime/plugins/notes-node` is a reference implementation and `node runtime/plugin-contract-test.mjs` verifies its descriptor, update, and search behavior. Node is one adapter, not a dependency of every plugin app.

## File Broker

`file-broker` is an Android library with `AndroidFileBroker`. It creates `ACTION_OPEN_DOCUMENT` / `ACTION_CREATE_DOCUMENT` intents, persists URI permissions, and reads/writes through `ContentResolver`. It rejects non-`content://` references and caps reads. The existing `NativeAgentBridge` workspace tools remain app-private and path-confined; external document access is a separate module and seam.
