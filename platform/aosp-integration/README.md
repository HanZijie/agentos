# AOSP integration

这里记录将 AgentOS 接入 AOSP 的位置和约束。默认开发不构建系统镜像；`platform/checkout` 只在需要 Cuttlefish 验证时放置 AOSP `repo` checkout，并保持未跟踪。

```text
system/agent/                         sideagentd、协议、init 和 domain
platform/framework/agent-manager/     AgentManagerService 设计
platform/product/                     产品包、权限和 system app 配置
platform/checkout/                    AOSP checkout（本地、不提交）
```

后续 AOSP 变更包括：

- `PRODUCT_PACKAGES` 加入 sideagentd 和系统前端；
- `init` service 与 `service_contexts`；
- `system_server` 注册 AgentManagerService；
- sideagentd 的 UID、file_contexts 和 SELinux domain；
- 系统签名前端和 Plugin allowlist。

这些内容通过单独的手动平台 workflow 验证，不进入默认 PR CI。
