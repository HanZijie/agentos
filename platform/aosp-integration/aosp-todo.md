# AOSP 变更全局 TODO

这是 AgentOS 所有 AOSP 侧改动的唯一事实来源。[迁移清单](../../docs/migration-roadmap.md)的 M5/M6 引用本文，不重复维护细节。

维护约定：

- 状态只有三种：`[ ]` 未开始、`[~]` 进行中、`[x]` 已完成且附证据（commit、测试输出或 Cuttlefish 验证记录的位置）。
- 标注"待验证假设"的条目，先在目标 AOSP 版本上验证行为，再决定是否修改代码；验证结论要回写到条目里。
- AOSP 文件路径基于通用 AOSP 结构，checkout 后如与目标版本不符，修正路径而不是删除条目。
- 本仓库不提交 AOSP 源码；所有 AOSP 修改以 patch 序列或本地分支形式存放在 `platform/checkout`（不跟踪），本文记录索引。

当前基线：`platform/checkout` 尚未放置 AOSP checkout。已添加未编译的
bootstrap overlay：`platform/aosp-integration/overlay/`，包含 sideagentd
health Binder、Plugin manifest discovery/按需 bind 骨架和基础 SELinux/init
文件；这些文件必须在目标 AOSP 分支上编译和运行后才能标为 `[x]`。

## 0. 前置：checkout 与构建环境

- [ ] 选定目标 AOSP 版本与分支（Cuttlefish 可用、内核带 binder freezer 支持），记录版本号到本节。候选方案是 `android-latest-release` 的 Cuttlefish userdebug；尚未锁定 revision，Pixel 8 真机作为后续硬件目标。
- [ ] `repo init` / `repo sync` 到 `platform/checkout`，保持未跟踪。
- [ ] Cuttlefish `userdebug` lunch target 能启动并 adb 连接。
- [ ] 建立 patch 管理方式（`repo diff` 导出或本地 topic branch），并记录在本节。

## 1. sideagentd 进程落地

- [~] init rc：overlay 已产出 `sideagentd.rc`（class、专用 user/group、SELinux label）；仍需在 checkout 中分配 AID、接入产品 makefile 并启动验证。
- [ ] 专用 UID：在 `system/core/libcutils/include/private/android_filesystem_config.h`（或 AID 分配的目标机制）为 sideagentd 分配固定 AID；不是 root，不是 system。
- [ ] `PRODUCT_PACKAGES` 加入 sideagentd 与系统前端（`platform/product/`）。
- [ ] 数据目录：`/data/agent/<user>/` 目录创建、属主与标签（配合 §2）。
- [~] Binder 服务注册：overlay 已定义 `agentos.sideagentd` 和 `ISideagentd.getHealth()`；仍需目标 AOSP 编译、servicemanager 注册和重启验证。

## 2. SELinux

- [~] `sideagentd` domain：overlay 已产出 domain、`file_contexts`、`service_contexts`；仍需接入目标 `system/sepolicy`、跑 neverallow 和记录 denial 结果。
- [ ] 数据目录标签：sideagentd 私有数据目录专用 label；显式禁止读取其他用户 app-private 目录。
- [ ] Binder 规则：允许 `sideagentd ↔ untrusted_app`（及 priv_app）之间由 capability session 引出的 Binder 调用。
- [ ] 反向约束：前端进程不得直接持有 Plugin endpoint binder；只有 system_server 和 sideagentd 可以。
- [ ] neverallow 审计：sideagentd 不得 exec 第三方可写路径、不得访问 Keystore 之外的 credential 存储。

## 3. AgentManagerService（system_server）

- [~] 在 overlay 中新增 AgentManagerService bootstrap 骨架：PackageManager manifest discovery、per-user enablement、`BIND_AUTO_CREATE` bind 和 sideagentd health 读取；仍需接入 `SystemServer` 并用 stable AIDL 编译。
- [ ] 版本化 AIDL + 结构化 Parcelable（替换迁移期 `command(name, payload)`）。
- [ ] sideagentd 生命周期监管：启动等待注册、Binder death 重连、状态恢复。
- [ ] UserManager 生命周期：user start/stop/unlock 时启停用户级资源、撤销订阅与 lease。
- [ ] Plugin 身份校验：PackageManager 包名/UID/签名/版本比对（契约 §5 校验顺序）。
- [ ] per-user Plugin 启用状态持久化（契约 §3.2），设置项与默认禁用语义。
- [~] overlay 已定义按需 `bindServiceAsUser` + `openPluginSession` 的发现/握手路径；capability session 移交 sideagentd、持久化启用状态和完整调用管道仍未完成。

## 4. Plugin 权限与产品配置

- [ ] 定义 `BIND_AGENT_PLUGIN` 权限（`signature|privileged`），定稿最终权限字符串与 intent action（替换契约中的 `agentos.*` 占位符，回写契约 §3.1）。
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

- [ ] `dumpsys agent`：健康状态、Session/Task 计数、sequence、错误分类（架构文档 §诊断）。
- [ ] `dumpsys agent plugins`：per-user 启用状态、活跃 session、lease 计数、资源注入统计（契约 §11）；不输出内容本体与 credential。
- [ ] `cmd agent health` / `cmd agent sessions --user` / `cmd agent tasks --user`。

## 7. 系统测试（Cuttlefish，M6）

- [ ] sideagentd 启动、SELinux 无 denial、Binder 注册可见。
- [ ] 多用户：user start/stop/unlock 的 Session 与 lease 撤销语义。
- [ ] Plugin 端到端：manifest 发现 → 启用 → 按需 bind → 握手 → tool 调用 → resource 注入 → binder death 撤销。
- [ ] freezer 矩阵：§5 全部验证项在 freezer 开/关两种配置下通过。
- [ ] 平台镜像构建放手动 workflow，不进默认 PR CI。

## 依赖关系

```text
§0 checkout ──> §5 验证项 ──> §5 修改项 ──┐
§0 checkout ──> §1 sideagentd ──> §2 SELinux ──> §7 系统测试
§3 AgentManagerService ──> §4 权限/产品 ──> §7
```

§5 的验证项只依赖 checkout 和一个最小测试 App，可以先于 §1–§3 单独做：用一个假 host（普通 privileged 测试进程）bind 测试 Plugin，就能回答 freezer 四个验证问题。建议作为 checkout 后的第一件事，结论直接决定 §5 修改项的规模。
