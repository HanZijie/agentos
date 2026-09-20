# 在 Codex 中开发和调试 Android

在项目根目录运行下列命令。脚本会读取 `local.properties` 中的 SDK 路径，并在没有设置 `JAVA_HOME` 时使用 Android Studio 自带的 JDK，因此不需要修改全局 shell 配置。

```bash
./tools/android/android.sh doctor       # 检查 SDK、Java、AVD 和 ADB 连接
./tools/android/android.sh start        # 启动或复用 Pixel_8a，等待 Android 启动完成
./tools/android/android.sh run          # 编译 debug APK、覆盖安装并重新启动 App
./tools/android/android.sh configure-model # App 已安装时单独导入 .env.anthropic.local
./tools/android/android.sh logs         # 当前 App 进程的实时日志，Ctrl+C 退出
./tools/android/android.sh logs -d       # 读取当前 App 进程已有日志后退出
./tools/android/android.sh crashes      # 读取设备的崩溃缓冲区
./tools/android/android.sh screenshot   # 保存 build/codex/screenshot.png
./tools/android/android.sh ui           # 保存 build/codex/ui.xml
```

`run` 安装的是 debug 构建，保留已有应用数据，并重新启动应用进程。默认目标是 `Pixel_8a`；脚本按 AVD 名称识别设备，不依赖 `emulator-5554` 这个可能变化的编号。

`.env.anthropic.local` 只在本机读取。设置 `ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`，可选设置 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_MAX_TOKENS`；脚本通过临时 ADB 文件交给 debug test runner，再写入 Android Keystore。密钥不会作为 Gradle 参数、APK 资源或日志输出。也可以使用 `ANTHROPIC_ENV_FILE=/path/to/file ./tools/android/android.sh run` 指定配置文件。

可以直接对 Codex 说：“修改这个页面，运行到模拟器，截图并检查日志。”截图和日志由本机 ADB 读取，模拟器界面由 Android Emulator 显示。

## 更多调试命令

```bash
./tools/android/android.sh adb shell input tap 200 400
./tools/android/android.sh adb shell input keyevent KEYCODE_BACK
./tools/android/android.sh adb shell dumpsys activity activities
./tools/android/android.sh gradle :frontends:agenriod:testDebugUnitTest
./tools/android/android.sh gradle :frontends:agenriod:connectedDebugAndroidTest
./tools/android/android.sh gradle :frontends:agenriod:lintDebug
./tools/android/android.sh instrumentation  # 自动安装 Notes Plugin，运行设备测试并导入本地 Anthropic 配置
```

`logs` 按启动时的进程 ID 过滤。重新启动 App 后，应重新运行 `logs`。`crashes` 读取整个设备的崩溃记录，其中可能包含其他应用的记录，需要核对包名和时间。设备上的测试命令要求模拟器已经启动。

默认包名是 `com.example.agenriod`，启动 Activity 是 `com.example.agenriod/.MainActivity`。修改包名后同步更新脚本，或使用 `ANDROID_APP_ID` / `ANDROID_ACTIVITY` 覆盖。

```bash
ANDROID_AVD=Another_AVD ./tools/android/android.sh run
ANDROID_SERIAL=emulator-5556 ./tools/android/android.sh logs
```

`ANDROID_SERIAL` 显式指定设备；同时连接多台设备时可用它固定目标。请先用 `doctor` 确认编号。

## Codex 中的运行入口

Codex 的本地环境支持把项目命令设为顶部动作，动作会在内置终端中运行。可使用 `./tools/android/android.sh run` 作为运行命令，使用 `./tools/android/android.sh logs` 作为日志命令。参见 [OpenAI 本地环境文档](https://learn.chatgpt.com/docs/environments/local-environment)。

如果 Codex 沙箱报告 ADB 的 `Operation not permitted`，或 Gradle 无法写入 `~/.gradle`，应对相应的本机开发命令使用授权执行。SDK、AVD 和 Gradle 缓存位于项目目录之外。

## Agent 沙箱下的 Gradle

部分 Agent 沙箱会注入损坏的 `JAVA_TOOL_OPTIONS`、禁止 JVM 使用双栈（IPv6）loopback socket，并禁止在 `~/.gradle` 内做 rename/unlink。`./tools/android/android.sh gradle` 已内置应对：

- 覆盖 `JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true`，让 daemon、测试 worker、ddmlib→adb 的所有 JVM IPC 走 IPv4；
- `GRADLE_USER_HOME` 固定为项目内 `.gradle-user-home/`（已 gitignore；首次可从 `~/.gradle` 拷贝 `caches/` 与 `wrapper/` 预热）；
- JVM 临时目录固定为 `build/tmpdir/`。

因此在沙箱里应始终通过 `./tools/android/android.sh gradle …` 调用构建，不要直接运行 `./gradlew`。

需要交互式断点调试时，可在 Android Studio 打开同一个项目，使用 **Attach debugger to Android process** 附加到 `com.example.agenriod`。Codex 中的这套入口提供编译、部署、界面操作、截图及日志调试。
