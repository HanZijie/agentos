# Plugin 生命周期和 MCP

## 系统 Plugin 会话

Plugin 代码始终运行在提供它的 App UID 和进程中。Agent 系统侧只保存能力摘要和运行时会话，不把第三方代码加载到 `sideagentd` 地址空间。发现、按需绑定、握手、tool 调用和 resource 注入的完整语义由 [Plugin Injection Contract v1](../system/agent/contracts/plugin-injection-v1.md) 冻结。

连接由系统按需发起（AutofillService 模式），App 不需要常驻进程：

```text
PackageManager
    ↓ 包名、UID、签名、版本和用户启用校验
AgentManagerService
    ↓ BIND_AUTO_CREATE 拉起/解冻 + openPluginSession 握手
App Plugin endpoint service
    ↓ capability session（endpoint binder + granted 集合）
sideagentd
    ↓ Binder beginInvoke / beginReadResource / MCP call
App Plugin 进程
```

空闲时系统 unbind，允许 Plugin 进程被冻结或回收；下次需要时重新拉起并握手，产生新的 `pluginSessionId` 和新的能力租约。Plugin 进程死亡时，系统撤销该 capability session；已经发出的调用允许返回，但不会在新的会话中自动重放。

静态 manifest 锚点（endpoint service + `BIND_AGENT_PLUGIN` 权限 + meta-data 摘要）只用于发现和设置页展示，不是身份凭据。权威能力声明来自握手时的运行时 descriptor（protocolVersion 3，声明 `tools`、`resources` 和可选 `mcpServers`），schema 见契约第 6 节。

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

`frontends/agenriod` 中现有的 App-private manifest、PluginHostService、`PluginProcessRegistration` 推送注册和 MCP 设置页继续用于原型测试。它们不是系统注册中心；迁移到 `AgentManagerService` 后，这些实现只保留为开发和测试的兼容适配器。protocolVersion 2 的平铺 `capabilities` 声明经适配器映射为无 schema、`sideEffects: "external"` 的 tool。
