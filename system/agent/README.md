# system/agent

这里是 Agent 系统数据面的实现位置。

```text
contracts/  系统接口、事件 schema 和 Agent Bus 协议
daemon/     sideagentd 主进程、运行时和 capability broker
init/       init service 定义
sepolicy/   sideagentd 的 domain、文件和 Binder 标签
```

`sideagentd` 必须是独立进程。它不能链接到 Compose、Activity 或前端状态，也不能把第三方 Plugin 代码载入自己的地址空间。第一阶段只做健康检查、Binder 注册和可恢复任务骨架，再迁移 Agent Runtime。
