# AOSP integration

这里记录将 AgentOS 接入 AOSP 的位置和约束。默认开发不构建系统镜像；`platform/checkout` 只在需要 Cuttlefish 验证时放置 AOSP `repo` checkout，并保持未跟踪。

```text
system/agent/                         sideagentd、协议、init 和 domain
platform/framework/agent-manager/     AgentManagerService 设计
platform/product/                     产品包、权限和 system app 配置
platform/checkout/                    AOSP checkout（本地、不提交）
```

所有 AOSP 侧改动（sideagentd 落地、SELinux、AgentManagerService、Plugin 权限、freezer 与 phantom process killer 调优、系统测试）以 [AOSP 变更全局 TODO](aosp-todo.md) 为唯一事实来源，按状态和验证证据维护。

这些内容通过单独的手动平台 workflow 验证，不进入默认 PR CI。

## Bootstrap overlay

`overlay/` 是第一阶段可复制到 AOSP checkout 的最小系统切片：

- versioned AIDL health API and Plugin endpoint bootstrap types;
- native `sideagentd` that registers `agentos.sideagentd` and reports health;
- init rc, dedicated domain/file/service labels and a Product-independent
  `AgentManagerService` discovery skeleton;
- manifest discovery on user/package lifecycle, per-user enablement and
  `BIND_AUTO_CREATE` binding;
- freezer verification invariants. The overlay intentionally does not grant a
  broad freezer exemption before the target AOSP branch is measured.

Prepare a local checkout only after selecting the target branch:

```bash
AOSP_ROOT=/path/to/aosp ./tools/aosp/prepare-overlay.sh
```

The script copies source files (not documentation) into the checkout and
refuses a dirty target or an existing conflicting file unless
`ALLOW_DIRTY_AOSP=1` or `ALLOW_OVERWRITE_AOSP=1` is explicitly set. It does
not sync AOSP, flash a device or modify the Git repository containing this
project.
