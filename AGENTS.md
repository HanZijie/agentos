# AgentOS 协作约定

## 项目边界

- `sideagentd` 是 Agent 的系统宿主；它不依赖 Activity、App Service 或前台服务。
- `AgentManagerService` 是 `system_server` 中的控制面，只管理生命周期、用户、权限、Plugin 注册和前端路由。
- `frontends/agenriod` 是前端和迁移参考实现，不应继续扩展成 Agent 的最终宿主。
- 任意 App 通过稳定系统接口接入 Agent。前端不拥有任务、Session 或事件日志的事实来源。
- 第三方 Plugin 在自己的 UID 和进程中执行；系统侧只保存注册状态和受控能力会话。

## 表达

- 区分已验证事实、设计选择和待验证假设。
- 不把“系统进程”笼统地写成 `system_server`。Agent Runtime 应在独立 `sideagentd` 中运行。
- 不用术语代替因果解释；说明每个接口、目录和进程解决的具体问题。
- 协议、权限和数据生命周期必须写清楚，不能依赖调用方猜测。

## 目录规则

- 系统进程、AIDL、init 和 SELinux 设计放在 `system/agent` 与 `platform`。
- 前端代码放在 `frontends`；公共 Plugin 协议放在 `plugins/api`。
- 参考 Runtime 放在 `runtime`，不能被误写成已部署的系统 daemon。
- AOSP checkout 放在 `platform/checkout`，不要在其中运行 `git init`，也不要把 AOSP 源码提交到本仓库。
- 构建、设备和 CI 辅助脚本放在 `tools`。

## Android 原型开发

- 使用 `./tools/android/android.sh` 调用 Android 工具；脚本会定位 SDK 并复用 Android Studio JDK。
- 默认复用 `Pixel_8a` AVD；先检查设备状态，再启动新的模拟器。
- 修改前端后运行 `./tools/android/android.sh build`，需要 UI 证据时运行 `run`、`logs -d`、`screenshot` 和 `ui`。
- 运行测试时区分 JVM 单元测试、设备测试、Lint 和未来的 Cuttlefish 系统测试。
- 不把 App 原型编译通过当成 `sideagentd` 或 `system_server` 已验证。

## 系统组件开发

- `system_server` 不执行模型循环、QuickJS、网络请求或第三方 Plugin 代码。
- `sideagentd` 使用专用 UID 和 SELinux domain，所有数据目录和 Binder 服务都要有明确标签。
- 系统 AIDL 必须版本化，带 request id、sequence、取消、错误分类和重连语义。
- Agent 事件必须可持久化、可重放、可按序订阅；不能只通过 Activity 回调传递。
- 外部副作用工具需要幂等键、操作记录和恢复策略；不能用“进程重启后全部重试”代替一致性设计。
- 模型输入、远程响应、Plugin 返回值和 Skill 正文都属于不可信输入。

## Git 和验证

- 本仓库根目录是 `agenriod`；提交前检查 `git status`，不要提交 `build`、AOSP checkout、密钥或本地模型配置。
- 每次结构变更至少运行 `./tools/ci/check-architecture.sh`、Node 契约测试和受影响的 Gradle 单元测试。纯文档改动只需要架构检查；Android 模块改动再运行 Gradle。
- 系统目录的协议或权限变更必须同时更新 README、架构文档和迁移清单。
- 提交信息使用简短、可检索的动词开头，例如 `docs: define agent output stream`。
