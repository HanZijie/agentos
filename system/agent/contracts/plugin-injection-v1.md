# Plugin Injection Contract v1

本文冻结 AgentOS Plugin 运行时注入的逻辑语义：App 如何在运行时把受控能力声明注入 Agent 系统进程，系统如何发现、绑定、握手、调用 tool、注入 resource 和撤销。

它与两份契约配套：[Agent Bus v1](agent-bus-v1.md) 定义前端会话流并显式把 Plugin 注册协议排除在外；[Session Scheduling Contract v1](session-scheduling-v1.md) 第 8 节冻结 capability lease 的使用与撤销语义。本文是 lease 的上游供给：它产出 Plugin session 和 granted capability 集合，不重复定义 lease。

本文中的“必须”“不能”和“可以”是契约要求。实现可以替换 Binder 细节、进程管理策略和存储，但不能改变对 App、Agent runtime 和调用方可见的语义。逻辑操作使用与 Bus 相同的分层：JSONL reference transport 用于协议测试，Android 生产实现使用版本化 AIDL/Binder，两者语义必须一致。

## 1. 理念和不变量

Plugin 是 App 运行时向 Agent 系统进程注入的运行时变量和受控能力声明，不是加载进系统进程的代码：

- 跨进程边界只有数据：descriptor、参数、结果。Plugin 代码始终留在提供它的 App UID 和进程中；`system_server` 与 `sideagentd` 不加载第三方代码。
- descriptor 是运行时变量：每次 Plugin session 建立时由 endpoint 现取，只在该 session 生命周期内有效。系统不把 descriptor 内容持久化为事实；持久化的只有包身份、用户启用状态和授权记录。
- JSON 不是身份。身份事实来自 Binder calling UID 和 PackageManager 的包名、签名、版本；descriptor 只是候选声明。
- 能力集合只能收窄，不能放大：granted 集合 = 声明集合 ∩ capability policy ∩ 用户启用。Agent prompt、前端和 Plugin 自身都不能扩大它。
- capability 分两类 kind：**tool**（可能有外部副作用的调用）和 **resource**（无副作用的瞬时只读取值）。resource 内容以 system reminder（系统提醒块）注入当轮模型输入，永不写入会话历史（第 8 节）。
- 认证 header、API key 和用户 credential 不进入公共 catalog、事件流、诊断输出或模型 prompt。
- Plugin 返回值和 resource 内容都是不可信输入。

## 2. 对象

| 对象 | 含义 | 生命周期 |
|---|---|---|
| Plugin package | 声明 Plugin endpoint 的 Android 包 | 安装到卸载 |
| Plugin endpoint | App 内受 BIND 权限保护的 service 及其 Binder 接口 | 进程存活且被系统绑定期间 |
| Plugin session | 一次成功握手产生的注入关系，持有 `pluginSessionId` 与 granted 集合 | 握手成功到撤销 |
| Capability session | 移交给 `sideagentd` 的调用凭据：endpoint binder + 身份事实 + granted 集合 | 同 Plugin session |
| Capability lease | Plugin session 与一个 Session、worker generation 的绑定 | 由调度契约第 8 节冻结 |

一个 Plugin session 属于一个 Android userId，跨用户不共享。`pluginSessionId` 一次性使用：endpoint 断开、进程死亡或任何撤销之后重建，必须生成新的 `pluginSessionId`，不能复用（对齐调度契约第 8 节）。

v1 一个包最多声明一个 Plugin endpoint，且 `pluginId` 必须等于包名。

## 3. 发现、安装态和用户启用

### 3.1 manifest 锚点

Plugin package 在 manifest 中声明 endpoint service：

```xml
<service
    android:name=".AgentPluginEndpointService"
    android:permission="agentos.permission.BIND_AGENT_PLUGIN"
    android:exported="true">
  <intent-filter>
    <action android:name="agentos.intent.action.PLUGIN_ENDPOINT" />
  </intent-filter>
  <meta-data
      android:name="agentos.plugin.summary"
      android:resource="@xml/agent_plugin_summary" />
</service>
```

- `agentos.permission.BIND_AGENT_PLUGIN` 是 `signature|privileged` 权限，只有系统持有。endpoint service 必须要求它，否则任意 App 都能直接绑定 endpoint；未受该权限保护的声明在握手前拒绝。最终权限与 action 字符串在 `platform/product` 的 AOSP 集成中定稿，契约约束的是语义，不是字面值。
- `meta-data` 摘要只用于设置页和 catalog 的离线展示（名称、图标、能力概述），不建立任何能力，也不是身份凭据。
- 权威能力声明只来自握手时的运行时 descriptor（第 5、6 节）。摘要与 descriptor 不一致时，以 descriptor 为准。

没有 manifest 锚点的动态注册（现有 `PluginProcessRegistration` 推送流程）只作为开发和测试的兼容适配器保留，不属于系统契约，系统部署中不可用。

### 3.2 用户启用

Plugin 对每个 user 默认**禁用**。启用状态由 `AgentManagerService` 按 `(userId, pluginId)` 持久化，语义对齐通知监听等系统组件的 per-user 授权：

- 启用需要用户在系统设置显式操作，或由设备策略以可审计的方式授予；
- 禁用立即撤销该 user 下该 Plugin 的所有 session 和 lease；
- 包卸载、签名变化和用户删除都清除启用状态；
- 未启用的 Plugin 不出现在 Agent 可用能力中，系统不 bind、不握手。

## 4. 连接模型：按需绑定和解冻

系统是 bind 的发起方。App 不需要常驻进程，也不主动注册：

1. 某 Session 需要一个 capability，而该 `(userId, pluginId)` 没有活跃 Plugin session；
2. `AgentManagerService` 校验启用状态和 policy，然后以目标 user 对 endpoint service 执行 `BIND_AUTO_CREATE` 绑定；进程不存在则拉起，被冻结则解冻；
3. 握手（第 5 节）成功后，capability session 移交 `sideagentd`；
4. 空闲超过 `pluginIdleUnbindMs` 且没有有效 lease 和 in-flight 调用时，系统主动 unbind，允许进程回到 cached、被冻结或被回收。这是正常路径，不是错误；下次需要时重新执行 1–3，产生新的 `pluginSessionId` 和新的 lease。

绑定与连接生命周期由 `AgentManagerService` 持有；endpoint binder 移交 `sideagentd` 后，tool 和 resource 调用在 `sideagentd` 与 App 之间直接进行，`system_server` 不在数据路径上。

进程管理约束：

- 绑定期间 endpoint 进程持有 bound-service 优先级。平台必须保证活跃 capability session（存在有效 lease 或 in-flight 调用）期间，endpoint 进程不被 cached-apps-freezer 冻结、不被 phantom process killer 终止。
- 拉起与解冻的延迟计入调用 deadline；调度契约的 `executionTimeoutMs` 不因此放松。bind 失败或握手超时按 `plugin_unavailable` 处理；系统可以退避重试 bind，持续失败时依赖该 capability 的 Session 按调度契约进入 `paused`。
- Plugin 不得依赖自行 fork 的常驻子进程；平台的冻结与查杀豁免只覆盖 endpoint 进程本身。
- resource 读取应当从内存状态直接返回；需要耗时计算或 IO 的数据应设计为 tool。

以下平台行为是设计选择加待验证假设，必须在目标 AOSP 版本上验证后才能当作事实（见第 13 节）：同步 Binder 事务对冻结进程的解冻触发路径；freezer 豁免与 phantom process killer 调优的具体实现点。

## 5. 握手

bind 返回 endpoint binder 后，系统调用（逻辑操作；Binder 映射为版本化 AIDL）：

```text
openPluginSession(pluginSessionId, hostInfo, hostCallback) -> descriptor
sessionGranted(pluginSessionId, grantedTools, grantedResources)   # 系统 -> endpoint, oneway
closePluginSession(pluginSessionId, reasonCode)                   # 双方均可发起
```

`pluginSessionId` 由系统生成。`hostInfo` 至少包含：

```json
{
  "protocolVersions": ["plugin-injection/1"],
  "hostVersion": "0.1.0",
  "userId": 0
}
```

endpoint 校验协议版本兼容后返回 descriptor；不兼容返回 typed error。系统在 `handshakeTimeoutMs` 内未完成握手则 unbind 并记录。

校验顺序，全部通过才建立 session：

1. calling identity 与 PackageManager 事实一致：包名、UID、签名、版本、启用状态；
2. descriptor schema、`descriptorMaxBytes`、数量上限和命名规则；
3. `pluginId` 等于包名；
4. capability policy 过滤得到 granted 集合；granted 为空集时不建立 session。

握手成功的产物：`AgentManagerService` 中的 Plugin session 记录，以及移交 `sideagentd` 的 capability session。

`hostCallback`（endpoint → 系统）：

```text
notifyResourcesChanged(pluginSessionId, resourceNames)   # 标记 on_change 资源为 dirty
notifyCapabilitiesChanged(pluginSessionId)               # 声明集合已变化，请求重新握手
requestClose(pluginSessionId, reasonCode)                # 请求优雅退出
```

能力集合在一个 session 内不可变。`notifyCapabilitiesChanged` 不就地修改 granted 集合；系统在安全点关闭当前 session 并以新的 `pluginSessionId` 重新握手。

## 6. Descriptor v3

```json
{
  "protocolVersion": 3,
  "pluginId": "com.example.notes",
  "displayName": "Notes",
  "version": "1.2.0",
  "tools": [
    {
      "name": "notes.search",
      "description": "Search notes by keyword",
      "inputSchema": {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"]
      },
      "sideEffects": "none",
      "timeoutHintMs": 8000
    },
    {
      "name": "notes.update",
      "description": "Update one note",
      "inputSchema": {"type": "object"},
      "sideEffects": "external"
    }
  ],
  "resources": [
    {
      "name": "notes.recent",
      "description": "Titles of the five most recently edited notes",
      "refresh": "on_change",
      "maxBytes": 4096
    }
  ],
  "mcpServers": [
    {"id": "notes", "transport": "streamable-http", "url": "https://example.test/mcp"}
  ]
}
```

规则：

- `name` 匹配 `[a-z][a-z0-9_.-]{0,63}`，在本 descriptor 内唯一。对 Agent 暴露的完整名是 `<pluginId>/<name>`，系统以此保证跨 Plugin 无冲突。
- `sideEffects` 只有 `none` 和 `external`；缺省按 `external` 保守处理。`external` tool 的调用必须携带幂等键（第 7 节）。
- `inputSchema` 是 JSON Schema object。系统在暴露给模型前可以裁剪声明，但不能放大。
- `resources[].refresh` 只有 `per_turn` 和 `on_change`；`maxBytes` 不得超过 `resourceMaxBytesCap`。
- `mcpServers` 语义沿用 [Plugin 生命周期和 MCP](../../../docs/plugin-lifecycle-mcp.md)；MCP 工具经系统 MCP client 汇入同一 `<pluginId>/` 命名空间。
- protocolVersion 2 的平铺 `capabilities: [string]` 只被迁移适配器接受，映射为无 schema、`sideEffects: "external"` 的 tool；系统契约要求 v3。

系统配置（与调度契约的配置块同一模式）：

```text
descriptorMaxBytes      descriptor 总字节上限，默认 64 KiB
maxToolsPerPlugin       默认 64
maxResourcesPerPlugin   默认 16
inlinePayloadMaxBytes   args/result 内联上限，默认 256 KiB
handshakeTimeoutMs      默认 5000
pluginIdleUnbindMs      默认 60000
resourceReadTimeoutMs   默认 2000
resourceMaxBytesCap     单资源内容上限，默认 8 KiB
reminderBudgetBytes     每轮注入总预算，默认 32 KiB
```

## 7. Tool 调用

逻辑操作（Binder 上映射为 oneway + callback，不用阻塞事务承载长调用）：

```text
beginInvoke(pluginSessionId, leaseId, requestId, tool, argsJson,
            idempotencyKey?, deadlineEpochMs, sink)
cancelInvoke(pluginSessionId, requestId)
```

`sink` 收到恰好一次终态回调：

```json
{
  "requestId": "req-1",
  "status": "ok",
  "resultJson": "{\"matches\": 3}",
  "attachments": []
}
```

```json
{
  "requestId": "req-1",
  "status": "error",
  "error": {"code": "timeout", "message": "backend not responding", "retryable": false, "dataJson": null}
}
```

要求：

- `requestId` 由系统生成、全局唯一。endpoint 对重复的 `beginInvoke(requestId)` 必须幂等：同一执行去重，不得启动第二次副作用。
- `sideEffects: "external"` 的 tool：系统必须传 `idempotencyKey` 并写入 `tool_operations` 操作记录；endpoint 必须以它去重。系统对未收到终态的调用**不自动重放**；恢复遵循调度契约的 unknown Attempt 语义。
- `deadlineEpochMs` 是绝对时限，包含拉起与解冻时间。到期系统发送 `cancelInvoke` 并进入调度契约的取消与超时流程；deadline 之后到达的结果可以被丢弃，endpoint 仍应释放资源。
- 取消是尽力而为：endpoint 以 `cancelled` 错误或正常结果确认；`cancelGraceMs` 内无确认按 unknown 处理。
- `argsJson` 与 `resultJson` 不超过 `inlinePayloadMaxBytes`；更大的结果通过 `attachments`（名称、MIME 类型加只读 PFD）传递。attachment 由 `sideagentd` 落到受控存储后再暴露给运行时，不把 PFD 直接交给模型层。
- 每次调用必须携带有效 `leaseId`。lease 已撤销时系统侧拦截，endpoint 也可以拒绝（`not_entitled`）。

Seam 级错误码，由 `sideagentd` 映射到 Bus 与任务错误分类：

```text
invalid_request   请求形状非法                 retryable=false
unknown_tool      tool 不在 granted 集合       retryable=false
invalid_args      参数不符合 inputSchema       retryable=false
not_entitled      lease 无效或已撤销           retryable=false
busy              endpoint 暂时过载            retryable=true
timeout           endpoint 侧超时              retryable=false
cancelled         已确认取消                   retryable=false
unavailable       endpoint 依赖不可用          retryable=true
internal          endpoint 内部错误            retryable=false
```

## 8. Resource 与 system reminder 注入

resource 是无副作用、幂等的瞬时只读取值；任何有副作用的行为必须声明为 tool。

读取操作与 tool 同构，复用 `cancelInvoke`：

```text
beginReadResource(pluginSessionId, leaseId, requestId, resource,
                  maxBytes, deadlineEpochMs, sink)
```

```json
{
  "requestId": "req-2",
  "status": "ok",
  "content": "## Recent notes\n- 会议纪要\n- 采购清单",
  "mimeType": "text/markdown",
  "generatedAt": 1770000000000,
  "truncated": false
}
```

v1 的 `content` 限定 UTF-8 文本（含 JSON 文本）；二进制内容不属于 v1。

注入语义，全部为契约要求：

1. resource 内容只影响**当轮模型输入的组装**。turn boundary 定义为每次向模型发起推理请求前的输入组装点；内容以独立 system reminder 块附着在本次输入的末尾（最新用户输入与工具结果之后的约定位置）。
2. 不写入会话历史：不成为持久 message，不修改任何既有 message，不进入可重放事件流。第 N 次模型调用注入的 reminder 不出现在第 N+1 次调用的历史段中；每次调用的历史段只由持久会话消息构成。会话历史保持 append-only，模型输入的历史前缀在资源刷新前后逐字节稳定——这是选择 system reminder 而不是写入上下文历史的直接原因：资源刷新只改变尾部，不失效模型侧 KV cache 的前缀命中。
3. 每个 reminder 块必须标注来源 `pluginId` 和不可信标记。resource 内容是不可信输入：运行时与工具授权决策不得因 reminder 中的指令样文本而改变，它对模型只是数据。
4. 拉取只发生在 turn boundary：`per_turn` 资源每个 boundary 拉取一次；`on_change` 资源仅在 `notifyResourcesChanged` 标记 dirty 后的下一个 boundary 拉取。v1 没有 mid-turn 注入。
5. 失败与超时（`resourceReadTimeoutMs`）：本轮省略该资源并写诊断记录，不阻塞任务，也不注入错误占位文本。
6. 预算：单资源按 `min(声明 maxBytes, resourceMaxBytesCap)` 截断，全轮合计受 `reminderBudgetBytes` 约束。注入与截断顺序必须确定：按 `pluginId` 字典序，再按 descriptor 声明顺序；超出预算时保留靠前资源，丢弃项写诊断记录。
7. 持久化：只记录元数据（资源名、字节数、耗时、内容哈希、截断与省略标志）为不可重放的诊断记录。内容本体不持久化；Snapshot 与事件重放不包含历史资源快照——旧快照是过时的世界状态，重放它是错误。

## 9. 生命周期与撤销

Plugin session 状态：

```text
binding -> handshaking -> active -> draining -> closed
```

- endpoint binder death：session 立即失效，所有关联 lease 撤销（调度契约第 8 节）；in-flight 调用允许返回，但不会在新 session 中自动重放。
- 包更新、签名变化、用户停止、用户禁用和 policy 收紧：系统主动 `closePluginSession`，先撤销 lease、拒绝新调用，再在 `cancelGraceMs` 内 drain in-flight 调用。
- `requestClose`：endpoint 请求优雅退出，系统按同样的 drain 流程处理。
- 任何重建都产生新的 `pluginSessionId`；调用凭据不跨 session 存活。

## 10. 安全与授权分层

四层授权，缺一不可，各层只回答自己的问题：

| 层 | 事实来源 | 回答的问题 |
|---|---|---|
| 平台身份 | PackageManager、Binder calling UID、签名 | 这个包是谁 |
| App opt-in | manifest service + `BIND_AGENT_PLUGIN` 权限 | 它是否自愿参与且只对系统暴露 |
| 用户启用 | `AgentManagerService` per-user 状态，默认禁用 | 这个用户是否允许它服务 Agent |
| 会话 lease | 调度契约第 8 节 | 这个 Session 此刻能不能用它 |

- capability session 的 endpoint binder 只移交给 `sideagentd`。SELinux 必须显式允许 `sideagentd` domain 与 app domain 之间的 Binder 调用，并禁止前端进程直接持有 endpoint binder。
- `system_server` 只在控制路径上（发现、校验、握手、启用状态、撤销），不在 tool 与 resource 的数据路径上。
- 事件、诊断和 catalog 不含 credential、认证 header 或资源内容本体。

## 11. 诊断

`dumpsys agent plugins` 按 user 至少输出：

- 已安装与已启用的 Plugin 及版本；
- 活跃 session、granted 能力计数、lease 计数；
- 最近错误分类计数与最近撤销原因；
- 资源注入统计：次数、字节、截断与省略计数。

诊断不输出 descriptor 全文、资源内容、调用参数或 credential。

## 12. v1 暂不包含

- Plugin 提供 prompt 或 skill 正文的系统化注入；
- mid-turn 资源推送与订阅；
- 二进制或图片 resource 内容；
- 单包多 Plugin、跨用户共享 session；
- 远程（非本机）Plugin 进程；
- MCP OAuth discovery 与 stdio transport（沿用 [Plugin 生命周期和 MCP](../../../docs/plugin-lifecycle-mcp.md) 的排除项）；
- AIDL 生成代码与最终权限、action 字符串（AOSP 集成时定稿）。

## 13. 验证要求

实现 Plugin Broker 前，reference tests 必须覆盖：

1. 握手：版本协商、descriptor 校验、policy 只收窄不放大、granted 空集拒绝建立；
2. `pluginId` 不等于包名、service 未受 BIND 权限保护、descriptor 超限时拒绝建立 session；
3. 未启用的 user 不 bind；启用后按需 bind 拉起进程并完成握手；
4. 空闲 unbind 后再次需要：新 `pluginSessionId`、新 lease，旧凭据全部失效；
5. binder death：lease 撤销、新调用被拒、in-flight 结果允许返回且不自动重放；
6. 重复 `requestId` 幂等；`external` tool 缺少 `idempotencyKey` 被系统拒绝；
7. deadline 到期触发取消；`cancelGraceMs` 内无确认进入 unknown Attempt 语义（对齐调度契约 6.2）；
8. cache 前缀不变性：资源内容变化前后各执行一轮，会话历史存储与可重放事件流的既有条目逐字节不变，仅当轮模型输入的 reminder 块不同；
9. `on_change` 未标 dirty 不拉取，标记后下一个 boundary 恰好拉取一次；`per_turn` 每个 boundary 一次；
10. 资源读取失败或超时：本轮省略、有诊断记录、任务不被阻塞；
11. 预算截断确定性：同一输入集合的注入与截断结果可复现；
12. reminder 指令注入：资源内容包含指令样文本时，工具授权与 granted 集合不受影响，内容只作为标注来源的数据进入模型输入；
13. 平台验证（Cuttlefish，M6）：冻结进程的解冻触发路径、freezer 豁免与 phantom process killer 调优点。
