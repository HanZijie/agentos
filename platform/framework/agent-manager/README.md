# AgentManagerService

`AgentManagerService` 是 `system_server` 中的控制面。它不运行 Agent loop，只负责：

- 启动用户级 Agent runtime 并等待 sideagentd 注册；
- 校验前端调用方和 Plugin 身份；
- 建立、撤销和恢复 sideagentd 的 Binder 会话；
- 路由输入、取消、snapshot 和输出订阅；
- 暴露 `dumpsys agent` 和 `cmd agent` 诊断入口。

服务接口应使用稳定 AIDL 和结构化 Parcelable。当前 App 的 `IAgentService.command(name, payload)` 只能作为迁移适配器，不能直接成为系统公开接口。
