# 项目协作约定

## 表达

- 区分事实和推断，准确说明不确定性。
- 不为显得深刻而制造神秘感，不堆砌专业名词。
- 不因用户偏好而附和；根据证据调整判断。

## Android 开发

- 这是原生 Android Kotlin / Jetpack Compose 项目，应用模块为 `app`。
- 优先通过 `./scripts/android.sh` 调用 Android 工具；脚本定位 SDK 并复用 Android Studio 自带 JDK。
- 默认使用用户已有的 `Pixel_8a` AVD。先检查连接，复用已运行设备。
- 修改应用后使用 `./scripts/android.sh run` 编译、安装并启动 debug 应用。
- 使用 `./scripts/android.sh logs -d`、`crashes`、`screenshot`、`ui` 获取运行证据。
- 界面交互可使用 `./scripts/android.sh adb shell input ...`。只根据当前截图或 UI 层级定位操作。
- 按改动范围运行已有单元测试、设备测试或 lint；不将编译通过等同于界面已验证。
- ADB 访问本机端口、启动 AVD 和 Gradle 写入用户缓存可能需要 Codex 的授权执行。
- 常用命令和调试说明见 `docs/android-development.md`。
