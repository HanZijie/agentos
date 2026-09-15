# Agent Plugin Interface v1

Every implementation exposes a descriptor and one invocation operation:

```text
describe() -> { protocolVersion: 1|2, id, name, description, tools[], mcpServers[]? }
invoke(toolName, argsJson) -> resultJson | { error: string }
```

Android uses `AgentPluginService` AIDL and `AgentPluginHost` registration; Node uses `definePlugin` and may be hosted over HTTP with the same JSON payloads. A process-owned Plugin registers from `Application.onCreate`, so tools remain available while its process is alive, including when its Activity is in the background. Tool names and parameter schemas are data in the descriptor, so the Agent Host does not depend on the implementation language.

Protocol version 2 may declare Streamable HTTP MCP servers. The Host negotiates `initialize`, `tools/list`, and `tools/call` for those servers and withdraws their tools when the Plugin endpoint dies. MCP headers are kept app-private and are not returned by the public catalog or System Prompt.
