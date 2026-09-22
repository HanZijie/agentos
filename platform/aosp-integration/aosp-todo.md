# AOSP 变更全局 TODO

这是 AgentOS 所有 AOSP 侧改动的唯一事实来源。[迁移清单](../../docs/migration-roadmap.md)的 M5/M6 引用本文，不重复维护细节。

维护约定：

- 状态只有三种：`[ ]` 未开始、`[~]` 进行中、`[x]` 已完成且附证据（commit、测试输出或 Cuttlefish 验证记录的位置）。
- 标注"待验证假设"的条目，先在目标 AOSP 版本上验证行为，再决定是否修改代码；验证结论要回写到条目里。
- AOSP 文件路径基于通用 AOSP 结构，checkout 后如与目标版本不符，修正路径而不是删除条目。
- 本仓库不提交 AOSP 源码；所有 AOSP 修改以 patch 序列或本地分支形式存放在 `platform/checkout`（不跟踪），本文记录索引。

当前基线：源码版本固定为 `android-15.0.0_r34`，但本轮新服务器上的 AOSP
checkout 和构建结果不作为仓库内容保存。`platform/aosp-integration/overlay/`
包含 sideagentd health Binder、stable AIDL v1、真实 `AgentOsPluginProbe`、
Plugin manifest discovery/按需 bind 控制面和基础 SELinux/init 文件；
`62223a7` 及后续提交还保存了 Cuttlefish-only/Pixel 8 target 接线脚本、
checkout revision 校验、仓库外备份和 fixture tests。代码和 fixture test
不是 Android 编译或启动证据。

官方 stock Cuttlefish build `16373615` 的 image zip 与 host package 已在
仓库外 `../.local/aosp-artifacts/2026-09-22-rebuild/fallback/` 完成 SHA-256
校验并保存。19:17 已验证 QEMU 启动、ADB `127.0.0.1:6520 device` 和
`sys.boot_completed=1`；guest build ID 为 `CP2A.260605.016`。19:19 的
`index.json` 记录 93 个已校验文件、0 error、0 pending，步骤与证据见
[stock Cuttlefish runbook](stock-cuttlefish.md)。stock 包不含 AgentOS overlay，
`agentos` 服务缺失符合预期。本轮没有已完成的 AgentOS 自定义 Cuttlefish
或 Pixel 8 镜像，也没有 AgentOS 真机测试，因此不能标为 Ready。

## 0. 前置：checkout 与构建环境

- [x] 选定目标 AOSP 版本为 `android-15.0.0_r34`，并在接线脚本中校验 manifest 默认 revision 及参与接线项目的 tag commit；Pixel 8（shiba）作为显式后续 target。
- [~] `repo init` / `repo sync` 与 checkout 证据在新服务器上已重新开始，但远端 checkout、resolved manifest 和 patch 仍需保存到本地证据目录；AOSP 全量源码不进入仓库。
- [x] 官方 stock Cuttlefish build `16373615` 通过 QEMU 启动并连接 ADB（19:17 的 `adb-baseline.txt`，路径见上述 runbook）。
- [x] stock Cuttlefish 上真实跨 App Plugin/MCP 原型测试通过（`NotesPluginCrossAppTest`，证据见 [host recovery record](cuttlefish-host.md)）；该结果不替代 AgentManagerService/sideagentd 验收。
- [~] stock Cuttlefish 自然 freezer 探针已实现并实测 `NOT_OBSERVED`（40 秒内同一 Notes PID 未冻结）；当前绑定策略不能回答最终 system_server 活跃 session 豁免问题。
- [ ] 固定 `android-15.0.0_r34` 自定义 Cuttlefish `userdebug` target 完成构建、启动和 ADB 连接；stock 的 CP2A 系统不能替代该验收。
- [~] frameworks/base、Go、clang 的 archive/tree 核对已通过；`pdk,linux` 同步仍不完整，并带入了属于 `pdk` 的 Darwin 项目；需明确排除 Darwin，补齐 Rust/misc 等输入并保存 resolved manifest。
- [~] `tools/aosp/wire-platform.py` 负责按固定 tag 应用接线并把覆盖文件备份到 AOSP 根目录同级；构建前仍需导出 resolved manifest、repo diff/patch 和工具版本到本地证据目录。
- [x] 主机验证记录已保存：两块 NVMe 挂载、96 vCPU、JDK 17、`/dev/kvm` 和磁盘状态见仓库外 `../.local/aosp-artifacts/2026-09-22-rebuild/fallback/evidence-0/environment.txt`；本地备份工具使用 `rsync --partial --append-verify` 和 SHA-256 双端校验。

## 1. sideagentd 进程落地

- [~] init rc：overlay 已产出 `sideagentd.rc`，接线脚本会加入产品包、AID 1096 和对应平台文件；仍需目标 checkout 编译和启动验证。
- [~] 专用 UID：接线脚本在 `system/core/libcutils/include/private/android_filesystem_config.h` 申请 AID 1096；仍需确认目标分支编译和运行时属主，不是 root/system。
- [~] `PRODUCT_PACKAGES` 已由 Cuttlefish/Pixel 8 target 接线脚本加入 sideagentd；系统前端尚未实现为可安装产品组件。
- [ ] 数据目录：`/data/agent/<user>/` 目录创建、属主与标签（配合 §2）。
- [~] Binder 服务注册：overlay 已定义 `agentos.sideagentd` 和 `ISideagentd.getHealth()`；仍需目标 AOSP 编译、servicemanager 注册、重启和 health 查询验证。

## 2. SELinux

- [~] `sideagentd` domain：接线脚本会合并 domain、`file_contexts`、`service_contexts` 到目标 `system/sepolicy/private`；仍需 neverallow、启动和 denial 结果。
- [ ] 数据目录标签：sideagentd 私有数据目录专用 label；显式禁止读取其他用户 app-private 目录。
- [ ] Binder 规则：允许 `sideagentd ↔ untrusted_app`（及 priv_app）之间由 capability session 引出的 Binder 调用。
- [ ] 反向约束：前端进程不得直接持有 Plugin endpoint binder；只有 system_server 和 sideagentd 可以。
- [ ] neverallow 审计：sideagentd 不得 exec 第三方可写路径、不得访问 Keystore 之外的 credential 存储。

## 3. AgentManagerService（system_server）

- [~] overlay 已新增 AgentManagerService：PackageManager manifest discovery、包/UID/签名/版本校验、per-user enablement、`BIND_AUTO_CREATE` bind、握手、断连重试和 sideagentd health 读取；接线脚本会接入 `SystemServer` 和 stable AIDL Java 依赖，仍需编译和启动验证。
- [~] 已保存版本化 stable AIDL v1 + 结构化 Parcelable；完整 Plugin 操作接口仍未完成。
- [ ] sideagentd 生命周期监管：启动等待注册、Binder death 重连、状态恢复。
- [~] UserManager 生命周期：overlay 已处理 user start/stop/unlock 与删除用户时的 Plugin 清理；Session/lease 撤销仍未实现，待系统测试。
- [~] Plugin 身份校验：overlay 已实现包名/UID/签名/版本比对；待安装、升级、签名变化和多用户测试。
- [~] per-user Plugin 启用状态持久化：overlay 已写入 `/data/system/agentos/plugins.json`，默认禁用；设置页和重启验收待完成。
- [~] overlay 已定义 `bindServiceAsUser` + `openPluginSession` 的发现/握手路径，并保存 stable AIDL v1；capability session 移交 sideagentd、descriptor v3、完整调用管道仍未完成。
- [ ] 修复同步握手无法取消的问题：两个不返回的 Plugin 可耗尽两个握手工作线程；使用可隔离或异步的握手机制并验证后续 Plugin 可恢复。

## 4. Plugin 权限与产品配置

- [~] 接线脚本已定义 `com.example.agentos.permission.BIND_AGENT_PLUGIN`（`signature|privileged`）并保留 `agentos.intent.action.PLUGIN_ENDPOINT`；最终命名和产品权限 allowlist 仍待定稿。
- [ ] Plugin endpoint 公共 AIDL：把契约 §5–§8 的逻辑操作（`openPluginSession`、`beginInvoke`、`beginReadResource`、`cancelInvoke`、`closePluginSession`、hostCallback、result sink）映射为 stable AIDL + Parcelable（oneway + callback，不用阻塞事务承载长调用），落在本仓库 `plugins/api` 替换迁移期 `describe()/invoke()` 接口；依赖上一条权限/action 定稿，语义以 daemon `plugin-broker.mjs` 参考实现和契约 §13 测试为准。
- [ ] `privapp-permissions` allowlist：系统前端与需要的系统组件（`frameworks/base/data/etc/` 或产品目录）。
- [ ] 系统签名前端的访问控制：只向系统签名前端暴露控制接口。
- [ ] 设置页入口：Plugin 列表（manifest 锚点发现 + meta-data 摘要）与 per-user 启用开关。

## 5. 进程管理与 freezer（契约 §4 的平台保证）

先验证、后修改。目标不变量：**活跃 capability session（有效 lease 或 in-flight 调用）期间，Plugin endpoint 进程不被冻结、不被终止**；空闲 unbind 后允许冻结与回收，下次按需拉起。

验证项（待验证假设，逐条回写结论）：

- [ ] bind flags 决定基线行为：确认 system_server 以 `BIND_AUTO_CREATE`（不带 `BIND_WAIVE_PRIORITY`）持有的绑定，是否足以让 endpoint 进程保持非 cached、从而天然不进入 freezer 与 phantom 查杀范围。若成立，本节大部分改动退化为"选对 bind flags + 测试锁定"。
- [ ] 冻结进程的同步 Binder 事务行为：验证目标版本上 sync transaction 对 frozen 进程是失败返回（`BR_FROZEN_REPLY`）并触发解冻，还是排队等待；确认 `CachedAppOptimizer` 与 binder driver（`BINDER_FREEZE`/`TXNS_PENDING`）的实际协同路径。这决定"binder 调用触发解冻"能否直接依赖。
- [ ] 解冻到可服务的延迟：测量拉起/解冻 → onBind → 握手完成的耗时分布，确认契约把该延迟计入 deadline 的默认值（`handshakeTimeoutMs` 5000ms）是否现实。
- [ ] phantom process killer 范围：确认 PPK 只针对 fork 子进程与超额 cached 进程；契约已禁止 Plugin fork 常驻子进程，验证 endpoint 主进程在 bound 状态下不受 `max_phantom_processes` 影响。

修改项（按验证结论裁剪）：

- [ ] `CachedAppOptimizer`（`frameworks/base/services/core/java/com/android/server/am/`）：如 bound 状态不足以豁免，增加 agent capability session 期间的冻结豁免或 `unfreezeTemporarily` 挂钩。
- [ ] `PhantomProcessList` / `OomAdjuster`：如验证发现 bound endpoint 进程仍可能被降级或查杀，为活跃 capability session 增加豁免；否则不改。
- [ ] `device_config`（namespace `activity_manager`）：确定 `cached_apps_freezer`、`max_phantom_processes` 等键在目标设备上的默认值，测试矩阵覆盖开/关两种状态。
- [ ] 空闲回收端到端：unbind → 进程进入 cached/frozen/被杀 → 下次需要重新拉起 + 新 `pluginSessionId` + 新 lease（契约 §13 测试 4 的平台版）。

## 6. 诊断

- [~] 已提供 `dumpsys agentos` 的 Plugin 列表和基础状态；Session/Task 计数、sequence、lease 与资源注入统计仍未完成。
- [~] 已提供 `cmd agentos health|plugins|enable|disable` 基础命令；`cmd agent` 兼容命令及完整 sessions/tasks 诊断仍未完成。

## 7. 系统测试（Cuttlefish，M6）

- [x] 官方 stock Cuttlefish build `16373615` image/host 本地 SHA-256 校验、QEMU 启动和 ADB 已验证，证据见 [runbook](stock-cuttlefish.md)；此项仅覆盖 stock 系统。
- [ ] AgentOS 自定义 sideagentd、SELinux 和 Binder 注册运行验证。
- [ ] 固化 Ubuntu 24.04 ready 容器的依赖与 Dockerfile，并完成干净主机复现；当前现场镜像需保留。
- [ ] 多用户：user start/stop/unlock 的 Session 与 lease 撤销语义。
- [ ] Plugin 端到端：manifest 发现 → 启用 → 按需 bind → 握手 → tool 调用 → resource 注入 → binder death 撤销。
- [ ] freezer 矩阵：§5 全部验证项在 freezer 开/关两种配置下通过。
- [~] 平台镜像构建保持手动执行；备份工具和证据目录已保存，默认 PR CI 不构建 AOSP。
- [ ] 在本地备份自定义镜像、校验、resolved manifest、patch 和日志后，才能销毁服务器或进入 Pixel 8 真机路线。

## 依赖关系

```text
§0 checkout ──> §5 验证项 ──> §5 修改项 ──┐
§0 checkout ──> §1 sideagentd ──> §2 SELinux ──> §7 系统测试
§3 AgentManagerService ──> §4 权限/产品 ──> §7
```

§5 的验证项只依赖 checkout 和一个最小测试 App，可以先于 §1–§3 单独做：用一个假 host（普通 privileged 测试进程）bind 测试 Plugin，就能回答 freezer 四个验证问题。建议作为 checkout 后的第一件事，结论直接决定 §5 修改项的规模。
