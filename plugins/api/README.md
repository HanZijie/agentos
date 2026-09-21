# Agent Plugin Interface

Plugin 运行在提供它的 App UID 和进程中。发现、按需绑定、握手、tool 调用和 resource 注入的系统语义由 [Plugin Injection Contract v1](../../system/agent/contracts/plugin-injection-v1.md) 冻结；本目录提供协议库和迁移期适配器。

目标 endpoint 契约（逻辑操作，Binder 映射为版本化 AIDL + oneway/callback）：

```text
openPluginSession(pluginSessionId, hostInfo, hostCallback) -> descriptor   # 系统发起
beginInvoke(pluginSessionId, leaseId, requestId, tool, argsJson, idempotencyKey?, deadline, sink)
beginReadResource(pluginSessionId, leaseId, requestId, resource, maxBytes, deadline, sink)
cancelInvoke(pluginSessionId, requestId)
closePluginSession(pluginSessionId, reason)
```

descriptor（protocolVersion 3）声明 `tools`、`resources` 和可选 `mcpServers`。静态 manifest 锚点只用于发现；package name、UID、签名和版本由 PackageManager/Binder 运行时校验，不能由 JSON 自报。headers 和 credential 留在 Plugin 或系统私有存储中，不返回到公共 catalog、事件流或 Agent prompt。

当前 AIDL（`describe()/invoke()` 同步字符串接口）和 `PluginProcessRegistration` 推送注册是迁移期原型：无版本、无 request id、无取消、无 deadline，不满足系统 AIDL 要求，只保留为开发和测试的兼容适配器，迁移后由上述契约接口替换。protocolVersion 2 的平铺 `capabilities` 声明经适配器映射为无 schema、`sideEffects: "external"` 的 tool。

Node reference implementation 和 Android Plugin 使用同一 descriptor 与操作语义；实现语言不应改变 `sideagentd` 的调用契约。
