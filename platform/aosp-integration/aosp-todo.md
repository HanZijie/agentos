# AOSP 变更全局 TODO

这是 AgentOS 所有 AOSP 侧改动的唯一事实来源。[迁移清单](../../docs/migration-roadmap.md)的 M5/M6 引用本文，不重复维护细节。

维护约定：

- 状态只有三种：`[ ]` 未开始、`[~]` 进行中、`[x]` 已完成且附证据（commit、测试输出或 Cuttlefish 验证记录的位置）。
- 标注"待验证假设"的条目，先在目标 AOSP 版本上验证行为，再决定是否修改代码；验证结论要回写到条目里。
- AOSP 文件路径基于通用 AOSP 结构，checkout 后如与目标版本不符，修正路径而不是删除条目。
- 本仓库不提交 AOSP 源码；所有 AOSP 修改以 patch 序列或本地分支形式存放在 `platform/checkout`（不跟踪），本文记录索引。

当前基线：源码版本固定为 `android-15.0.0_r34`。AOSP checkout、镜像和临时
checkout workaround 不进入仓库；本轮最终证据保存在 `.local/aosp-artifacts/2026-09-23-aosp-final/`，
远端完整证据在 `/mnt/aosp-out/evidence/agentos-aosp-20260923-final/`。`platform/aosp-integration/overlay/`
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
`agentos` 服务缺失符合预期。本轮已完成 AgentOS 自定义 Cuttlefish 镜像构建和启动验证；
Pixel 8 真机仍未刷写，因此不能把整条真机路线标为 Ready。

## 0. 前置：checkout 与构建环境

- [x] 选定目标 AOSP 版本为 `android-15.0.0_r34`，并在接线脚本中校验 manifest 默认 revision 及参与接线项目的 tag commit；Pixel 8（shiba）作为显式后续 target。
- [x] `repo init` / `repo sync` 在新服务器完成；目标 checkout 为 `android-15.0.0_r34`。源码不进入仓库，manifest/patch 索引和构建日志见 `.local/aosp-artifacts/2026-09-23-aosp-final/`。
- [x] 官方 stock Cuttlefish build `16373615` 通过 QEMU 启动并连接 ADB（19:17 的 `adb-baseline.txt`，路径见上述 runbook）。
- [x] stock Cuttlefish 上真实跨 App Plugin/MCP 原型测试通过（`NotesPluginCrossAppTest`，证据见 [host recovery record](cuttlefish-host.md)）；该结果不替代 AgentManagerService/sideagentd 验收。
- [~] stock Cuttlefish 自然 freezer 探针已实现并实测 `NOT_OBSERVED`（40 秒内同一 Notes PID 未冻结）；当前绑定策略不能回答最终 system_server 活跃 session 豁免问题。
- [x] 固定 `android-15.0.0_r34` 的 `aosp_cf_x86_64_only_phone-trunk_staging-userdebug` 完成 `m droid -j96`，生成 boot/super/system/vendor 等镜像；最终日志 `full-droid-20260923-071004.log` 返回 `BUILD_RC=0`。
- [x] 自定义 Cuttlefish 实例 2 通过 ADB `127.0.0.1:6521` 启动，`sys.boot_completed=1`；证据包含服务表、health、插件握手和镜像 SHA-256。
- [x] 诊断目标曾独立编译 `sideagentd` 与 `agentos_system_aidl-V1-java.jar`；完整镜像验收以最终 droid 构建为准。
- [x] 完整 `droid` 构建已通过。为补齐 r34 的选择性 checkout，远端使用了临时官方项目同步、无 Trusty VM 构建开关、service-fuzzer/file-context 测试样例和 linker 配置兼容修正；这些 patch 只在 AOSP checkout，未提交 GitHub。
- [~] frameworks/base、Go、clang 的 archive/tree 核对已通过；`pdk,linux` 同步仍不完整，并带入了属于 `pdk` 的 Darwin 项目；需明确排除 Darwin，补齐 Rust/misc 等输入并保存 resolved manifest。
- [~] `tools/aosp/wire-platform.py` 负责按固定 tag 应用接线并把覆盖文件备份到 AOSP 根目录同级；构建前仍需导出 resolved manifest、repo diff/patch 和工具版本到本地证据目录。
- [x] 主机验证记录已保存：两块 NVMe 挂载、96 vCPU、JDK 17、`/dev/kvm` 和磁盘状态见仓库外 `../.local/aosp-artifacts/2026-09-22-rebuild/fallback/evidence-0/environment.txt`；本地备份工具使用 `rsync --partial --append-verify` 和 SHA-256 双端校验。

## 1. sideagentd 进程落地

- [x] init rc：`sideagentd.rc` 已进入镜像并启动；运行时服务进程属主为 `sideagent` UID 1096。
- [x] 专用 UID：Cuttlefish 中 `ps` 显示 `sideagent 1096 ... sideagentd`，不是 root/system。
- [~] `PRODUCT_PACKAGES` 已由 Cuttlefish/Pixel 8 target 接线脚本加入 sideagentd。传入 `--frontend-apk` 与 `--notes-apk` 后，脚本还会将两个 APK 作为 platform-signed product 组件接入，并安装前端 privapp allowlist；完整镜像编译和设备验收仍待本轮验证。
- [ ] 数据目录：`/data/agent/<user>/` 目录创建、属主与标签（配合 §2）。
- [x] Binder 服务注册：`service list` 同时出现 `agentos` 与 `agentos.sideagentd`，`cmd agentos health` 返回 `state=ready`。
- [~] native `sideagentd` 已接入 V2 Plugin session、MiniMax HTTPS Worker、
  Jev 自动 Session 选择、持久化任务/事件和 restart recovery fencing；Soong、
  SELinux denial 审计、设备编译与 Binder death 恢复仍待验证。
- [~] Jev/MiniMax secret 注入：`/data/agent/secrets/agent.env` 由 sideagent UID
  读取并要求 0600，密钥不进入镜像或诊断输出；`tools/aosp/test-agentos-runtime.py`
  提供 userdebug Cuttlefish 的真实调用入口，设备证据尚未取得。

## 2. SELinux

- [x] `sideagentd` domain：镜像启动并完成服务注册；新增 file-context 样例通过 `plat_file_contexts_data_test`。仍需后续收紧跨域规则并做完整 denial 审计。
- [ ] 数据目录标签：sideagentd 私有数据目录专用 label；显式禁止读取其他用户 app-private 目录。
- [ ] Binder 规则：允许 `sideagentd ↔ untrusted_app`（及 priv_app）之间由 capability session 引出的 Binder 调用。
- [ ] 反向约束：前端进程不得直接持有 Plugin endpoint binder；只有 system_server 和 sideagentd 可以。
- [ ] neverallow 审计：sideagentd 不得 exec 第三方可写路径、不得访问 Keystore 之外的 credential 存储。

## 3. AgentManagerService（system_server）

- [x] AgentManagerService 已编译并在 system_server 中运行；`cmd agentos health` 走真实 system_server → sideagentd Binder 链路返回 `ready`。
- [x] stable AIDL v1 与结构化 Parcelable 已随镜像编译并安装；V2 Plugin
  endpoint 协议骨架已加入并通过 API 兼容性检查，V1 生成物保持可用。
- [~] sideagentd 生命周期监管：init 重启 daemon；持久化 Session/Task/Event，
  未确认 Attempt 在重新启动时标为 `unknown` 并发出 `task.recovery_required`；
  system_server Binder death 重连和设备矩阵仍待验证。
- [~] UserManager 生命周期：overlay 已处理 user start/stop/unlock 与删除用户时的 Plugin 清理；Session/lease 撤销仍未实现，待系统测试。
- [x] Plugin 身份校验和 manifest discovery 已通过内置 `com.example.agentos.probe`：发现后默认 disabled，`cmd agentos enable` 后状态为 `active`，日志收到 `AgentOsProbe: open`。
- [~] per-user Plugin 启用状态持久化：本轮验证了 user 0 的启用和运行状态；重启/升级/多用户覆盖仍待完成。
- [x] `bindServiceAsUser` + `openPluginSession` 发现/握手路径已在 Cuttlefish 实例通过；capability session 移交 sideagentd、descriptor v3、完整调用管道仍未完成。
- [~] `AgentManagerService` 已在 V2 AIDL 生成边界上注册/撤销
  `AgentPluginSession`，native `sideagentd` 已有 session 保存与
  invoke/resource/cancel 路由；实际镜像编译、Binder death 清理和端到端
  invoke 仍待验证。
- [ ] 修复同步握手无法取消的问题：两个不返回的 Plugin 可耗尽两个握手工作线程；使用可隔离或异步的握手机制并验证后续 Plugin 可恢复。

## 4. Plugin 权限与产品配置

- [~] 接线脚本已定义 `com.example.agentos.permission.BIND_AGENT_PLUGIN`（`signature|privileged`）并保留 `agentos.intent.action.PLUGIN_ENDPOINT`；最终命名和产品权限 allowlist 仍待定稿。
- [~] Plugin endpoint 公共 AIDL：`agentos_system_aidl` V2 已把契约 §5–§8
  的握手、`sessionGranted`、`beginInvoke`、`beginReadResource`、
  `cancelInvoke`、`closePluginSession`、host callback 和 result sink 映射为
  stable AIDL + Parcelable，并保留冻结 V1。当前只完成可编译协议边界；
  system_server → sideagentd capability session handoff 的 Java/native
  骨架已接通；Soong/设备编译验证、lease/deadline 校验、PFD attachment、
  Exactly-once 操作记录和 Plugin 端实现仍待接线。
- [~] `privapp-permissions` allowlist：产品接线已加入 `agenriod_frontend_privapp_permissions`，完整镜像安装和权限检查仍待验证。
- [x] 系统签名前端的访问控制：`ACCESS_AGENT` 为 `signature|privileged`，`AgentManagerService` 只允许获得该权限的前端创建 Session。
- [ ] 设置页入口：Plugin 列表（manifest 锚点发现 + meta-data 摘要）与 per-user 启用开关。

## 5. 进程管理与 freezer（契约 §4 的平台保证）

先验证、后修改。目标不变量：**活跃 capability session（有效 lease 或 in-flight 调用）期间，Plugin endpoint 进程不被冻结、不被终止**；空闲 unbind 后允许冻结与回收，下次按需拉起。

验证项（待验证假设，逐条回写结论）：

- [x] bind flags 基线已在真实 Cuttlefish Probe 上验证：启用 session 期间进程保持 bound、`cached=false`，12 秒采样未冻结。
- [~] 冻结后的重新绑定已验证：空闲 Probe 自然冻结后，重新 enable 在约 3.6 秒内恢复 active；仍需专门验证冻结期间同步 Binder 事务的 driver 返回语义（涉及 `BINDER_FREEZE` / `TXNS_PENDING`）。
- [x] 重新 enable → onBind → 握手完成已测得 3.6 秒，低于当前 5 秒握手超时；需要更多设备/负载样本。
- [~] Probe 主进程在 bound session 和冻结/恢复路径中通过；phantom process killer 的专门 fork 子进程矩阵仍未完成。

修改项（按验证结论裁剪）：

- [ ] `CachedAppOptimizer`（`frameworks/base/services/core/java/com/android/server/am/`）：如 bound 状态不足以豁免，增加 agent capability session 期间的冻结豁免或 `unfreezeTemporarily` 挂钩。
- [ ] `PhantomProcessList` / `OomAdjuster`：如验证发现 bound endpoint 进程仍可能被降级或查杀，为活跃 capability session 增加豁免；否则不改。
- [ ] `device_config`（namespace `activity_manager`）：确定 `cached_apps_freezer`、`max_phantom_processes` 等键在目标设备上的默认值，测试矩阵覆盖开/关两种状态。
- [x] 空闲回收端到端已通过：unbind → 自然冻结 → enable 产生新 session；强杀后产生新 PID、新 session 并恢复 active。

## 6. 诊断

- [~] `dumpsys agentos`、`cmd agentos health|plugins|enable|disable` 已在自定义镜像中真实执行；新增 `runtime-test`、`runtime-snapshot`、Session/Task 诊断等待本轮镜像验证。
- [~] `cmd agentos` 基础命令已在自定义镜像中真实执行；MiniMax/Jev 真实请求和 restart recovery 由 `test-agentos-runtime.py` 覆盖，当前尚无本轮设备证据。

## 7. 系统测试（Cuttlefish，M6）

- [x] 官方 stock Cuttlefish build `16373615` image/host 本地 SHA-256 校验、QEMU 启动和 ADB 已验证，证据见 [runbook](stock-cuttlefish.md)；此项仅覆盖 stock 系统。
- [~] AgentOS 自定义 sideagentd、SELinux 标签、Binder 注册和 system_server health 运行验证；上一轮 health 证据仍有效，native runtime 代码变更后的镜像需重新验证。
- [ ] 固化 Ubuntu 24.04 ready 容器的依赖与 Dockerfile，并完成干净主机复现；当前现场镜像需保留。
- [ ] 多用户：user start/stop/unlock 的 Session 与 lease 撤销语义。
- [~] Plugin 端到端已完成 manifest 发现 → 启用 → 按需 bind → 握手 → 禁用 → Binder death 重连 → 用户删除清理；tool/resource 调用和 capability lease 仍待完成。
- [~] Probe 生命周期已覆盖 freezer 开/关、自然冻结、重绑定、Binder death 和 user 10 删除；Binder driver 细节与 phantom fork 矩阵仍待补齐。
- [x] 平台镜像手动构建完成；最终证据和镜像 SHA-256 已保存，默认 PR CI 仍不构建 AOSP。
- [~] 自定义镜像 hash、构建日志、运行时 health/plugin/freezer 证据已备份到 `.local/aosp-artifacts/2026-09-23-aosp-final/`；完整 AOSP 镜像仍只保留在服务器，销毁前还需做远端归档。
- [~] 新建独立 checkout `/mnt/aosp-src/aosp-rerun-20260923` 已完成 r34 manifest、工具链、overlay 和选择性依赖同步；严格 Soong 分析仍在补齐 module SDK/平台项目，尚未生成第二份镜像。

## 依赖关系

```text
§0 checkout ──> §5 验证项 ──> §5 修改项 ──┐
§0 checkout ──> §1 sideagentd ──> §2 SELinux ──> §7 系统测试
§3 AgentManagerService ──> §4 权限/产品 ──> §7
```

§5 的验证项只依赖 checkout 和一个最小测试 App，可以先于 §1–§3 单独做：用一个假 host（普通 privileged 测试进程）bind 测试 Plugin，就能回答 freezer 四个验证问题。建议作为 checkout 后的第一件事，结论直接决定 §5 修改项的规模。
