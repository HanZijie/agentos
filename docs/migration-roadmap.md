# AgentOS 迁移清单

这是从当前 Android 原型迁移到系统 Agent 的最小顺序。每一步都应能单独验证，默认不构建完整 AOSP 镜像。

## M0：仓库和契约

- [x] 统一目录：前端、系统 Agent、平台接入、Plugin、库和工具。
- [x] 写下 AgentManager、sideagentd 和输出事件流的职责。
- [x] 把 Agent Bus 和输出事件协议固化成版本化协议文档。
- [x] 定义任务状态、错误分类、取消和重连语义。
- [x] 冻结 Session 状态、调度、公平性、并发、恢复和 Plugin capability lease 契约。

## M1：sideagentd 骨架

- [x] 添加独立的 Session Store、Session Scheduler 和 Worker 参考实现（无 Binder、无真实模型）。
- [ ] 添加最小 daemon 可执行文件和健康接口。
- [ ] 添加 init service 描述和独立 SELinux domain。
- [ ] 注册稳定 Binder 服务。
- [ ] 提供 `dumpsys agent` 和 `cmd agent health`。

## M2：AgentManagerService

- [ ] 在 `system_server` 中加入控制面服务。
- [ ] 处理 sideagentd 的 Binder death、重连和状态恢复。
- [ ] 添加 user start/stop/unlock 生命周期。
- [ ] 只向系统签名的前端暴露控制接口。

## M3：输出管道和存储

- [x] 在 Scheduler 参考实现中验证事件日志、per-session sequence 和 Snapshot + afterSequence 恢复。
- [ ] 将参考实现的 Store 接入系统 daemon 的正式生命周期。
- [ ] 把 Task Store 从原型 JSON 文件迁移到 SQLite/WAL。
- [ ] 为副作用工具增加 operation record 和幂等键。

## M4：前端迁移

- [ ] 让 `frontends/agenriod` 只调用 AgentManagerService。
- [ ] 移除前端对 Agent runtime、Task Store 和 Session Store 的所有权。
- [ ] 保留 Compose、VoiceInteraction 和通知作为前端入口。
- [ ] 用一个最小非 Agenriod 前端验证多前端订阅。

## M5：Plugin Broker

- [ ] 由 system_server 校验 Plugin UID、签名和版本。
- [ ] 将 Plugin capability 句柄传递给 sideagentd。
- [ ] Plugin 进程死亡时撤销 capability。
- [ ] 将本地 shell manifest 限定为开发模式。

## M6：平台集成

- [ ] 在 Cuttlefish userdebug 上编译和启动 sideagentd。
- [ ] 运行系统级 Binder、SELinux 和多用户测试。
- [ ] 将平台镜像构建放到手动 workflow，不放进默认 PR CI。
