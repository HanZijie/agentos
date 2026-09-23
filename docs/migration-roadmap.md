# AgentOS 迁移清单

这是从当前 Android 原型迁移到系统 Agent 的最小顺序。每一步都应能单独验证，默认不构建完整 AOSP 镜像。

2026-09-22 重建基线：源码固定 `android-15.0.0_r34`。`62223a7` 及后续提交已保存 overlay、自动接线、probe 和备份脚本；这些代码尚未在本轮形成可运行的 AgentOS 镜像。新主机环境已记录，官方 stock Cuttlefish build `16373615` image/host 包已在仓库外 `../.local/aosp-artifacts/2026-09-22-rebuild/fallback/` 校验保存，但启动未完成。stock 包不含 AgentOS；当前没有 AgentOS 真机验证，不能称为刷机就绪。

## M0：仓库和契约

- [x] 统一目录：前端、系统 Agent、平台接入、Plugin、库和工具。
- [x] 写下 AgentManager、sideagentd 和输出事件流的职责。
- [x] 把 Agent Bus 和输出事件协议固化成版本化协议文档。
- [x] 定义任务状态、错误分类、取消和重连语义。
- [x] 冻结 Session 状态、调度、公平性、并发、恢复和 Plugin capability lease 契约。
- [x] 冻结 Session 自动选择契约：per-user 30 分钟活跃池、最近 20 个冷候选补足、254 + `new_session` Choice、Brief、Jev token 预算、分阶段选择和安全回退（[session-selection-v1](../system/agent/contracts/session-selection-v1.md)）。
- [x] 冻结 Plugin 运行时注入契约：manifest 发现、per-user 启用、按需绑定/解冻、握手、tool 调用、resource 的 system reminder 注入（[plugin-injection-v1](../system/agent/contracts/plugin-injection-v1.md)）。

## M1：sideagentd 骨架

- [x] 添加独立的 Session Store、Session Scheduler 和 Worker 参考实现（无 Binder、无真实模型）。
- [x] 添加 SessionSelector、Jev Choice HTTP adapter 和 `submitAutoInput` 参考实现；密钥只从未跟踪的运行时配置读取，真实设备注入和镜像验证待完成。
- [~] 添加最小 daemon 可执行文件和健康接口（AOSP bootstrap overlay 已提供，待目标分支编译）。
- [~] 添加 init service 描述和独立 SELinux domain（overlay 和 AID/产品/平台策略接线已保存，待目标构建、neverallow 和启动验证）。
- [~] 注册稳定 Binder 服务（`agentos.sideagentd` health service 已定义，待 AOSP service manager 验证）。
- [~] 已实现 `dumpsys agentos` Plugin 列表及 `cmd agentos health|plugins|enable|disable` 基础诊断，待系统验证；Session/Task 诊断未实现。

## M2：AgentManagerService

- [~] 控制面已实现 manifest discovery、按用户持久化启用状态、绑定/握手和 health 查询；自动 `SystemServer` 接线已保存，待编译与启动验证。
- [ ] 处理 sideagentd 的 Binder death、重连和状态恢复。
- [~] 已实现 user start/stop/unlock、删除用户时清理 Plugin 记录和授予状态；Session/lease 生命周期及多用户系统测试待完成。
- [~] 现有控制 Binder 只允许 root/system UID，userdebug shell 可用诊断命令；系统签名前端的访问机制与迁移待完成。

## M3：输出管道和存储

- [x] 在 Scheduler 参考实现中验证事件日志、per-session sequence 和 Snapshot + afterSequence 恢复。
- [ ] 将参考实现的 Store 接入系统 daemon 的正式生命周期。
- [ ] 将 Session 自动选择接入稳定 Binder/AIDL，完成真实 Jev secret 注入、超时/回退诊断和多用户系统测试。
- [ ] 把 Task Store 从原型 JSON 文件迁移到 SQLite/WAL。
- [x] 在 sideagentd 参考数据面为副作用工具增加 SQLite `tool_operations`
  记录、幂等键、参数冲突检测和 `unknown` fence；Android native sideagentd
  的正式数据目录与恢复接线仍待完成。

## M4：前端迁移

- [ ] 让 `frontends/agenriod` 只调用 AgentManagerService。
- [ ] 移除前端对 Agent runtime、Task Store 和 Session Store 的所有权。
- [ ] 保留 Compose、VoiceInteraction 和通知作为前端入口。
- [ ] 用一个最小非 Agenriod 前端验证多前端订阅。

## M5：Plugin Broker

按 [plugin-injection-v1](../system/agent/contracts/plugin-injection-v1.md) 实现；AOSP 侧条目见 [AOSP 变更全局 TODO](../platform/aosp-integration/aosp-todo.md)。

- [x] daemon 参考实现 `PluginBroker`：descriptor v3 校验、启用状态、按需绑定/握手、invoke 与 resource/reminder 管道、lease 接线；契约 §13 reference tests 1–12 通过。

- [~] system_server 已实现包名、UID、签名、版本校验，待系统测试。
- [~] manifest 发现、`BIND_AGENT_PLUGIN` 权限接线与 per-user 启用状态持久化已实现；待安装、升级、禁用、删除用户及重启测试。
- [~] `BIND_AUTO_CREATE` 绑定、禁用时 unbind 和断连重试已实现；目前启用即保持绑定，按调用需求绑定/空闲释放及 freezer、phantom process killer 测试待完成。
- [~] stable AIDL v1 `openPluginSession` 和基础 descriptor 校验已实现；
  `agentos_system_aidl` V2 已冻结握手、capability grant、异步 tool/resource
  callback 和 cancel 的协议骨架，system_server → sideagentd handoff、
  descriptor v3 policy 与运行时调用仍未移植。
- [ ] 修复同步握手无法取消的问题：两个不返回的 Plugin 可耗尽两个握手工作线程；使用可隔离或异步的握手机制并验证后续 Plugin 可恢复。
- [~] 已增加 `AgentPluginSession` 稳定 parcelable，并由
  `AgentManagerService` 注册到 native `sideagentd`；设备编译、Binder death
  清理和正式 lease handoff 仍待验证。
- [~] Node sideagentd 参考实现已覆盖 requestId/幂等键、取消、deadline 和
  `tool_operations` unknown fence；Android sideagentd 的正式调用管道仍未接线。
- [ ] resource 读取与 system reminder 注入管道：turn boundary 拉取、预算与确定性截断、非重放诊断记录。
- [~] Plugin 断连会清理绑定与 session 并退避重试；完整 capability 撤销仍待移植与 Binder death 系统测试。
- [ ] 将 MCP transport、tool 调用、resource 注入和模型运行时从参考实现移植到系统数据面，完成真实端到端验证。
- [ ] 将本地 shell manifest 和推送注册限定为开发模式。

## M6：平台集成

AOSP 侧改动以 [AOSP 变更全局 TODO](../platform/aosp-integration/aosp-todo.md) 为唯一事实来源。

- [x] 固定 `android-15.0.0_r34` 并保存 Cuttlefish-only 自动接线、真实 `AgentOsPluginProbe` 测试源码与接线 fixture tests（`62223a7`、`bfde761`、`1c163f3`）。
- [x] 保存仓库外增量备份工具及校验记录机制（`bfde761`、`90bd0a1`、`941f125`）；运行中的构建仍需持续产出和备份证据。
- [~] 官方 stock Cuttlefish build `16373615` image/host 本地校验已完成；启动和 ADB 尚未完成。
- [ ] 在固定源码基线完成 Soong 分析、自定义 Cuttlefish userdebug 构建，并启动 sideagentd 与 `agentos` 服务。
- [ ] 运行系统级 Binder、SELinux 和多用户测试。
- [ ] 将平台镜像构建放到手动 workflow，不放进默认 PR CI。
- [ ] 按全局 TODO 的销毁前检查确认自定义镜像、校验、resolved manifest、patch、日志均有本地副本且最新代码已推送，再推进 Pixel 8 真机路线。
