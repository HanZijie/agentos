# system/agent

这里是 Agent 系统数据面的实现位置。

```text
contracts/  系统接口、事件 schema、Agent Bus 和 Session 调度协议
daemon/     sideagentd 主进程、运行时和 capability broker
init/       init service 定义
sepolicy/   sideagentd 的 domain、文件和 Binder 标签
```

`sideagentd` 必须是独立进程。它不能链接到 Compose、Activity 或前端状态，也不能把第三方 Plugin 代码载入自己的地址空间。第一阶段只做健康检查、Binder 注册和可恢复任务骨架，再迁移 Agent Runtime。

AOSP 的第一阶段 overlay 位于 [`platform/aosp-integration/overlay/`](../../platform/aosp-integration/overlay/)，源码基线固定为 `android-15.0.0_r34`。`62223a7` 及后续提交已保存 native health Binder、stable AIDL v1、init/SELinux、真实 probe APK 和自动接线脚本。Java 控制面还实现了 Plugin manifest 发现、包身份校验、按用户持久化启用状态、用户生命周期、绑定/握手、断连重试和基础 `cmd agentos`/`dumpsys agentos` 诊断。`tools/aosp/wire-platform.py` 默认接线 Cuttlefish，Pixel 8 为显式可选 target；旧文件备份位于 AOSP 树外。

这些是已保存的代码，尚未构成已验证的 AgentOS 系统。本轮新主机环境已记录，官方 stock Cuttlefish build `16373615` 的 image/host 包已备份并校验到仓库外 `../.local/aosp-artifacts/2026-09-22-rebuild/fallback/`；其启动尚未完成，且 stock 包不含 AgentOS overlay。当前没有完成的 AgentOS 自定义镜像或 AgentOS 真机测试。构建中的镜像、日志和 manifest 用 `tools/aosp/backup-artifacts.py` 持续保留本地副本；验收状态见 [AOSP 全局 TODO](../../platform/aosp-integration/aosp-todo.md)。

当前 native `sideagentd` 只返回健康信息，尚未承载这里的 Session/Plugin/MCP 参考实现。Plugin probe 只验证发现与握手，不能证明 MCP 或工具调用可用。控制面的同步握手即使超时也不能中止卡住的 Binder 调用，两个工作线程可能耗尽；异步握手或进程隔离、完整 capability/lease 管道及 freezer 矩阵仍待完成。

Session 调度契约见 [`contracts/session-scheduling-v1.md`](contracts/session-scheduling-v1.md)。实现前先通过该契约的 reference tests 验证串行 Session、跨 Session 并行、优先级公平、取消/超时、Snapshot 恢复和 Plugin capability lease 撤销。

Plugin 运行时注入契约见 [`contracts/plugin-injection-v1.md`](contracts/plugin-injection-v1.md)：manifest 发现、按需绑定/解冻、握手、tool 调用和 resource 的 system reminder 注入。实现 Plugin Broker 前先通过该契约第 13 节的 reference tests。

当前参考实现已经位于 [`daemon/`](daemon/)：`SessionStore` 使用 SQLite WAL 保存 Session 和事件，`SessionScheduler` 持有幂等、调度、恢复和 lease 语义；Worker 通过独立子进程运行 fake worker，或运行现有 Pi ACP adapter 的 `PiWorker`。这还是 sideagentd 数据面的参考实现，不是 Android Binder 服务。
