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
- Agent tasks and messages still come from `AgentService`/`AgentClient`; the
  assistant surface does not become a second task store.
- The prototype does not yet copy the foreground app's screen content into the
  prompt. `supportsAssist` remains declared for the future assist-data path,
  but the frontend currently shows a neutral ready state instead of implying
  that it has read the current page.

## Deployment checkpoint (2026-09-23)

The next validation step keeps `frontends/agenriod` as an APK installed outside
the AOSP image. On the target device, verify that Agenriod can be selected as
the default digital assistant and that the configured assistant gesture opens
the voice session. A long press of the power button is valid evidence only if
that device maps the gesture to the default assistant.

This is a validation checkpoint, not the final system-image decision. If the
frontend must ship inside the image, follow-up coding is required for the AOSP
product package, signing and privileged permissions, default-assistant
configuration, and device gesture configuration. The frontend also still has
to migrate from the app-private `AgentService`/`AgentClient` path to
`AgentManagerService` as described in the M4 roadmap.
