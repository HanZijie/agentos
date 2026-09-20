# Plugin 生命周期和 MCP

## 系统 Plugin 会话

Plugin 代码始终运行在提供它的 App UID 和进程中。Agent 系统侧只保存能力摘要和运行时会话，不把第三方代码加载到 `sideagentd` 地址空间。

```text
PackageManager
    ↓ 包名、UID、签名和版本校验
AgentManagerService
    ↓ capability session
sideagentd
    ↓ Binder / MCP call
App AgentPluginService
```

Plugin 进程死亡时，系统撤销该 capability session；已经发出的调用允许返回，但不会在新的会话中自动重放。Plugin 重启后需要重新握手，重新获得新的 session id 和能力租约。

静态 manifest 只用于发现和能力摘要，不是身份凭据：

```json
{
  "protocolVersion": 2,
  "pluginId": "com.example.notes",
  "version": "1.0.0",
  "service": "com.example.notes/.AgentPluginService",
  "capabilities": ["notes.search", "notes.update"],
  "mcpServers": [{
    "id": "notes",
    "transport": "streamable-http",
    "url": "https://example.test/mcp"
  }]
}
```

认证 headers 和用户 credential 留在系统或 Plugin 的私有存储中，不进入公共目录、事件流或 Agent prompt。

## MCP

`libraries/mcp-client` 是当前 Streamable HTTP 适配器。它支持：

- `initialize`、协议协商和 `notifications/initialized`；
- `tools/list` 分页和 `tools/call`；
- JSON 和 Server-Sent Events 响应；
- `tools/list_changed`、`ping`、session id 和显式清理；
- HTTPS 远端 endpoint 和 loopback HTTP 本地 endpoint；
- 请求/响应上限、header 校验、超时和不自动重放 `tools/call`。

系统迁移时，MCP client 应由 `sideagentd` 持有。前端只看到已经过 capability policy 过滤的工具摘要和事件。

OAuth discovery、stdio transport、task-mode MCP 请求以及 server-to-client resource/prompt subscriptions 暂不属于第一版系统协议。

## 迁移期兼容实现

`frontends/agenriod` 中现有的 App-private manifest、PluginHostService 和 MCP 设置页继续用于原型测试。它们不是系统注册中心；迁移到 `AgentManagerService` 后，这些实现只保留为兼容适配器。
