# Agent Plugin Interface v1

Plugin 运行在提供它的 App UID 和进程中。系统侧通过 `AgentManagerService` 校验身份，再将受控 capability session 提供给 `sideagentd`。

每个 Plugin 暴露一个描述和一个调用入口：

```text
describe() -> { protocolVersion, id, name, version, tools[], mcpServers[]? }
invoke(toolName, argsJson) -> resultJson | typed error
```

静态 descriptor 只用于能力发现。package name、UID、签名和版本由 PackageManager/Binder 运行时校验，不能由 JSON 自报。

协议版本 2 可以声明 Streamable HTTP MCP server。headers 和 credential 留在 Plugin 或系统私有存储中，不返回到公共 catalog、事件流或 Agent prompt。

Node reference implementation 和 Android Plugin 使用同一 descriptor/invoke 语义；实现语言不应改变 `sideagentd` 的调用契约。
