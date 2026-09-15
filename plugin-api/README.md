# Agent Plugin Interface v1

Every implementation exposes a descriptor and one invocation operation:

```text
describe() -> { protocolVersion: 1, id, name, description, tools[] }
invoke(toolName, argsJson) -> resultJson | { error: string }
```

Android uses `AgentPluginService` AIDL; Node uses `definePlugin` and may be hosted over HTTP with the same JSON payloads. Tool names and parameter schemas are data in the descriptor, so the Agent Host does not depend on the implementation language.
