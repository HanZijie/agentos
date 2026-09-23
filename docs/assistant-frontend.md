# Assistant frontend

`frontends/agenriod` now contains a system-assistant surface in
`SiriAssistantSurface`. Android creates that surface through
`AgenriodVoiceInteractionSessionService`; it is separate from the main
Compose activity and reuses `AgentClient` to submit text, cancel work, and
render the latest Agent output.

## Enable it on a device

1. Install the debug APK with `./tools/android/android.sh run`.
2. Open **Settings → Apps → Default apps → Digital assistant app**. The
   Agenriod settings page also has a shortcut to the same system screen.
3. Select **Agenriod** as the default assistant and grant microphone access if
   voice input is needed.
4. Use the assistant gesture configured by the device. On devices that route a
   long press of the power button to the default assistant, that gesture opens
   this surface and starts listening automatically.

The Android framework and device configuration own the power-button mapping.
An APK cannot intercept the power key globally, so the exact gesture must be
verified on the target device or emulator configuration.

## Current behavior

- The orb, status, text composer, microphone button, stop button, and dismiss
  button are rendered by Compose in the voice session.
- A gesture invocation starts `SpeechRecognizer` when the app has microphone
  permission. Text input remains available when speech recognition is missing.
- Hiding the session stops microphone capture but keeps the Agent client and
  Binder connection reusable for the next show. Final cleanup happens in
  `onDestroy`.
- In the product path, Agent tasks and messages come from
  `AgentManagerService`/`sideagentd`; the assistant surface does not become a
  second task store. `AgentService` remains only as migration-era test code.
- The prototype does not yet copy the foreground app's screen content into the
  prompt. `supportsAssist` remains declared for the future assist-data path,
  but the frontend currently shows a neutral ready state instead of implying
  that it has read the current page.

## Deployment checkpoint (2026-09-23)

The image path now stages the Gradle-built Agenriod and Notes APKs into the
AOSP product. `wire-platform.py --frontend-apk ... --notes-apk ...` installs
both as product components, signs them with the platform certificate, adds the
privileged permission allowlist, and adds the Cuttlefish or Pixel 8 resource
overlay. The overlay selects `com.example.agenriod` as the default Assistant
and sets `config_longPressOnPowerBehavior` to the Assistant value (`5`).

The VoiceInteraction and main Compose surfaces now create sessions through
`AgentManagerService`; they no longer start or bind `AgentService` in the
normal product flow. Notes exposes the system Plugin endpoint directly and no
longer registers through the Agenriod app-private Plugin host.

The native session path is wired through `AgentManagerService` to
`sideagentd`, including request IDs, automatic Jev Session selection, event
subscriptions, snapshots, cancellation and explicit recovery resolution.
`sideagentd` contains a native MiniMax-M3 HTTPS Worker and reads its credentials
from the protected `/data/agent/secrets/agent.env` file. The matching userdebug
Cuttlefish image must still run `tools/aosp/test-agentos-runtime.py` to produce
the final real-request and restart-recovery evidence.
