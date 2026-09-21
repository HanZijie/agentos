# AgentOS Demo Apps

这个目录是一个独立的 Android Gradle 根目录，用来演示 AgentOS 的三个普通 App 能力：

- `meeting-records`：会议纪要记录，支持本地增删改查；同时保留当前 Agenriod Host 的迁移期 Plugin endpoint，并新增 AOSP bootstrap protocol v3 endpoint；打开 App 后还会暴露一个 loopback Streamable HTTP MCP server。
- `calendar`：本地日程编辑器，支持创建、编辑、删除日程，并用日期/时间选择器填写表单。
- `alarm`：本地闹钟，支持设置、启用/停用和删除一次性闹钟；触发时通过 Android 通知提醒。

这个 Gradle 根目录没有被加入主工程的 `settings.gradle.kts`。因此它不会改变主工程的模块图，也不会参与主工程默认构建。`plugin-api` 只读复用 `../plugins/api` 的迁移期契约源码，没有复制或修改主工程文件。记录 App 额外内置了 AOSP bootstrap 所需的两份最小 AIDL，当前 overlay 尚未接入可调用的 tool/resource 数据面，因此它只负责 protocol v3 握手和 descriptor 声明。

## 构建

在本目录的上一级仓库根目录（`agenriod/`）执行：

```bash
./gradlew -p demo-apps :meeting-records:assembleDebug
./gradlew -p demo-apps :calendar:assembleDebug
./gradlew -p demo-apps :alarm:assembleDebug
```

或一次构建三个 APK：

```bash
./gradlew -p demo-apps :meeting-records:assembleDebug :calendar:assembleDebug :alarm:assembleDebug
```

APK 输出在各模块的 `build/outputs/apk/debug/`。记录 App 安装在运行中的 AgentOS 主 App 同一设备后，打开记录 App 即可激活 `meeting-records` Plugin；没有 AgentOS Host 时，记录编辑功能仍可单独使用，Plugin 注册会自动等待 Host。

## 演示边界

这些 App 使用应用私有 JSON 文件保存数据，目的是验证跨 App 能力路径和最小用户流程，不是生产级日历或提醒服务。记录 App 的 MCP token、端口和会话都由进程运行时生成，仅绑定 `127.0.0.1`，没有写入仓库。
