# system/agent

这里是 Agent 系统数据面的实现位置。

```text
contracts/  系统接口、事件 schema、Agent Bus 和 Session 调度协议
daemon/     sideagentd 主进程、运行时和 capability broker
init/       init service 定义
sepolicy/   sideagentd 的 domain、文件和 Binder 标签
```

`sideagentd` 必须是独立进程。它不能链接到 Compose、Activity 或前端状态，也不能把第三方 Plugin 代码载入自己的地址空间。第一阶段只做健康检查、Binder 注册和可恢复任务骨架，再迁移 Agent Runtime。

Session 调度契约见 [`contracts/session-scheduling-v1.md`](contracts/session-scheduling-v1.md)。实现前先通过该契约的 reference tests 验证串行 Session、跨 Session 并行、优先级公平、取消/超时、Snapshot 恢复和 Plugin capability lease 撤销。

Plugin 运行时注入契约见 [`contracts/plugin-injection-v1.md`](contracts/plugin-injection-v1.md)：manifest 发现、按需绑定/解冻、握手、tool 调用和 resource 的 system reminder 注入。实现 Plugin Broker 前先通过该契约第 13 节的 reference tests。

当前参考实现已经位于 [`daemon/`](daemon/)：`SessionStore` 使用 SQLite WAL 保存 Session 和事件，`SessionScheduler` 持有幂等、调度、恢复和 lease 语义；Worker 通过独立子进程运行 fake worker，或运行现有 Pi ACP adapter 的 `PiWorker`。这还是 sideagentd 数据面的参考实现，不是 Android Binder 服务。
