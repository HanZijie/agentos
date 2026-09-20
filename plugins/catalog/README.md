# Plugin catalog

Plugin 在自己的 App UID 和进程中运行。系统侧通过 PackageManager、Binder calling UID、签名、版本和能力声明建立 capability session。

推荐结构：

```text
assets/agent/manifest.json
assets/agent/skills/<skill-id>/SKILL.md
AgentPluginService
files/agent/state/
files/agent/cache/
```

Plugin manifest 是能力摘要，不是身份凭据。生产 Plugin 不能要求 sideagentd 执行任意 shell；工具调用应通过 Plugin Binder 或受控 MCP endpoint 完成。
