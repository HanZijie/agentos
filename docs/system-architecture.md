# AgentOS 系统架构

## 目标

Agent 是由 Android 系统启动和监管的独立系统组件。Agent 的进程、任务、Session、事件日志和 Plugin 会话不属于任何前端 App。App 通过系统接口使用 Agent，前端关闭或替换不会改变 Agent 的事实状态。

## 进程分层

```text
init
└── sideagentd
    ├── Agent runtime
    ├── Task / session store
    ├── Model gateway
    ├── Capability broker
    ├── Plugin session broker
    └── Output event log

system_server
└── AgentManagerService
    ├── sideagentd 生命周期和健康状态
    ├── UserManager 生命周期
    ├── 前端访问控制
    ├── Plugin 身份校验
    └── 系统 Binder API

System UI / App
└── Agent frontend client
    ├── 创建或连接 Session
    ├── 提交输入
    ├── 订阅事件流
    └── 渲染输出
```

`system_server` 不运行 QuickJS、模型请求、第三方 Plugin 或任意 shell。`sideagentd` 使用专用 Linux UID 和 SELinux domain；它不是 root，也不是 system UID。系统通过 init 负责进程重启，通过 AgentManagerService 负责 Binder 重连和状态恢复。

## 远期运行模型

Agent 应作为系统服务和常驻进程存在，由系统负责启动、监管、恢复和资源边界。前端只是 ACP/Binder 等入口的客户端，前端退出不改变 Agent 的 Session、任务和事件事实。

Plugin 应被理解为 App 运行时向 Agent 系统进程注入的运行时变量和受控 capability 声明。Plugin 代码留在提供它的 App UID 和进程内；`sideagentd` 接收经系统校验的描述、参数和调用结果，不加载第三方代码到 `system_server` 或 `sideagentd`。

上述注入语义由 [Plugin Injection Contract v1](../system/agent/contracts/plugin-injection-v1.md) 冻结：manifest 锚点加 per-user 启用负责发现与授权；连接由系统按需 `BIND_AUTO_CREATE` 拉起或解冻，空闲时回收；能力声明在每次握手时运行时获取，不持久化为事实。capability 分 tool 和 resource 两类——tool 是受幂等键与取消语义约束的副作用调用；resource 是无副作用的瞬时读取，内容以 system reminder 注入当轮模型输入，不写入会话历史，保证事件日志 append-only 与模型输入历史前缀的缓存稳定性。

这个模型的核心工程难点是 Session 调度。调度器需要在多个 User、前端、Session、Plugin capability 和 Agent worker 之间处理排队、优先级、公平性、并发上限、取消、超时、背压、断线、Plugin death 和 daemon 重启恢复。Session Store、Task Store、事件 sequence 和 capability lease 都应围绕这些调度语义设计。

上述语义由 [Session Scheduling Contract v1](../system/agent/contracts/session-scheduling-v1.md) 冻结。该契约将 Session 的状态机与 Task 的一次执行分开，并规定同一 Session 串行、不同 Session 受全局和 User 并发上限约束；实现可以替换 Scheduler 和 Store，但不能改变回执、事件顺序、Snapshot 恢复或 lease 撤销语义。

## 系统接口

系统接口分为三条 seam。跨前端的逻辑请求、响应和事件语义定义在 [Agent Bus v1](../system/agent/contracts/agent-bus-v1.md)；Android AIDL 和本地 reference transport 都应实现这套语义。

系统接口分为三条 seam：

1. **控制 seam**：前端向 `AgentManagerService` 提交输入、取消任务和管理 Session。
2. **运行时 seam**：`AgentManagerService` 与 `sideagentd` 之间交换任务、健康状态和恢复命令。
3. **能力 seam**：`sideagentd` 通过受控 Binder capability 调用系统能力和 App Plugin。

第一版接口需要包含：

- `createSession(userId, frontendId, options)`
- `submitInput(sessionId, requestId, input)`
- `cancelTask(requestId)`
- `subscribeOutput(sessionId, afterSequence, sink)`
- `getSnapshot(sessionId)`
- `getHealth()`
- `setAgentPluginEnabled(pluginId, enabled)`（per-user）

Plugin 的发现、按需绑定、握手（`openPluginSession`）、tool 调用与 resource 注入接口由 [Plugin Injection Contract v1](../system/agent/contracts/plugin-injection-v1.md) 单独冻结，不属于前端 API；前端只拿到经 capability policy 过滤的工具摘要，不直接持有 Plugin endpoint。

接口必须版本化。请求需要 request ID；事件需要 sequence；长操作需要取消和超时；断线需要从 sequence 恢复。第一版跨 App 输出使用系统 Binder 传递一个只读 `ParcelFileDescriptor` 管道，管道中的事件使用长度前缀的 UTF-8 JSON frame；管道断开后，前端以 `afterSequence` 重新订阅。慢读端不能阻塞 Agent，服务端应限制每个订阅者的缓冲并在超限时断开，前端再通过 snapshot + cursor 恢复。系统 Binder 只传递结构化控制数据和受限事件句柄，不能使用没有版本约束的 `command(name, payload)` 作为长期系统接口。

## 输出事件

Agent 以事件流作为唯一输出事实来源。事件写入事件日志后再向订阅者发送，事件顺序由每个 Session 的单调递增 sequence 保证。

```json
{
  "protocolVersion": 1,
  "sessionId": "session-1",
  "taskId": "task-1",
  "sequence": 42,
  "eventType": "message.delta",
  "timestamp": 1710000000000,
  "payload": {"text": "..."}
}
```

前端只保存自己的渲染缓存。重连时先读取 snapshot，再从 `afterSequence` 继续消费事件。多个前端可以订阅同一 Session，但每个前端的访问范围由 user、frontend identity 和系统授权决定。

## 持久化

`sideagentd` 需要维护可恢复的任务和事件存储。实现可以从 SQLite WAL 开始，抽象出后续可替换的 Store interface。

核心记录包括：

- `tasks`：用户输入、状态、重试策略和当前 checkpoint；
- `task_attempts`：每次执行的开始、结束和错误；
- `tool_operations`：外部副作用、幂等键和未知状态；
- `events`：可按 Session 和 sequence 读取的输出事件；
- `sessions`：用户、标题、上下文和最后序号；
- `plugin_sessions`：Plugin 身份、能力租约和 Binder 死亡状态。

进程重启不代表自动重做所有操作。读操作可以按策略重试；外部写操作必须依赖幂等键、操作记录和明确的未知状态处理。

## Plugin 安全

Plugin 运行在提供它的 App UID 中。系统从 PackageManager 和 Binder calling UID 获得身份，再校验签名、版本、声明的能力和 Android 权限。Plugin 的 JSON 描述只提供候选能力，不能作为身份凭据。

`sideagentd` 不执行第三方 App 提供的任意 shell 命令。开发期的本地 shell manifest 只作为兼容适配器保留，系统部署时使用经过批准的 Binder capability 或 MCP endpoint。

授权分四层，各自独立：平台身份（PackageManager、UID、签名）、App opt-in（manifest service + `BIND_AGENT_PLUGIN` 权限）、用户启用（AgentManagerService per-user 状态，默认禁用）和会话 lease（调度契约第 8 节）。完整语义见 [Plugin Injection Contract v1](../system/agent/contracts/plugin-injection-v1.md)。

## 用户与数据

系统服务必须显式处理多用户：

- 每个 User 有独立的 Session、任务和 Plugin 注册状态；
- 用户停止时撤销前端订阅和 Plugin capability；
- 用户解锁前只加载 Direct Boot 所需的最小恢复状态；
- API key 和 OAuth credential 由 Keystore2 管理，不进入 system_server 日志或公共事件；
- 数据目录使用专用 SELinux label，不能让 sideagentd 直接读取其他用户的 app-private 目录。

## 诊断

第一版系统集成必须提供：

```text
dumpsys agent
adb shell cmd agent health
adb shell cmd agent sessions --user <id>
adb shell cmd agent tasks --user <id>
```

诊断输出只显示状态、计数、sequence、错误类别和耗时，不输出 API key、完整提示词或敏感 Plugin 参数。
