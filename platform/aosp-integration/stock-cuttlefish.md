# Stock Cuttlefish 启动记录与恢复步骤

2026-09-22 19:17（Asia/Shanghai）已验证官方 build **16373615** 启动：ADB
`127.0.0.1:6520` 为 `device`，`sys.boot_completed=1`，`ro.build.id=CP2A.260605.016`，
hypervisor 为 `cf-qemu_cli`。stock 中 `cmd agentos health` 返回找不到服务，这是预期结果。
它证明当前主机能运行该官方镜像，不能替代 `android-15.0.0_r34` 自定义构建、AgentOS
Plugin/freezer 验证或 Pixel 8 镜像。

本地证据位于仓库外 `../.local/aosp-artifacts/2026-09-22-rebuild/fallback/`。
19:19 的 `index.json` 记录 93 个已校验文件、0 error、0 pending；成功启动日志位于
`evidence-0/fallback-boot/qemu-gpu-swiftshader/`，包括 `adb-baseline.txt`、
`agentos-health.txt`、`kernel.log`、`launcher.log` 和 `service-list.txt`。

## 已使用的环境

| 项目 | 已核对配置 |
| --- | --- |
| 主机 | Ubuntu 20.04，内核 `5.4.0-216-generic`，KVM 可用 |
| 运行容器 | `agentos-cf`，root，privileged，host network |
| 容器镜像 | `agentos/cuttlefish-host:ubuntu24.04-ready` |
| 设备 | `/dev/kvm`、`/dev/vhost-vsock`、`/dev/net/tun`，均为 rwm |
| 镜像/host 解压目录 | 主机 `/mnt/aosp-out/cf-stock-16373615` → 容器 `/cf` |
| 证据目录 | 主机 `/mnt/aosp-out/evidence/fallback-boot` → 容器 `/evidence` |

Ubuntu 24.04 容器用于满足 host package 的 glibc 依赖；它仍使用主机的 5.4 内核。
现场 ready 镜像曾在容器启动后补装依赖；现在仓库已保存锁定版本的 [host recovery recipe](cuttlefish-host.md)，并在独立容器中验证了官方 host package 的 QEMU 启动和 ADB 开机。**干净主机复现仍未验证**。
恢复时仍应保留该本地 Docker 镜像；依赖和镜像构建步骤已固化到 host recovery recipe，但干净主机重建仍需单独验收。两个官方归档的
SHA-256 在备份目录的 `SHA256SUMS` 中；不要混用其他 build 的 image 和 host package。

## 恢复与启动

已有成功实例时，先采集证据，不重复启动或删除实例目录。下面的主机命令仅用于需要
重新启动的情形。需要重置进程时，用 `docker stop agentos-cf` 停止整个容器，确认停止
后再处理挂载目录；不要在实例运行时清理 `/cf/cuttlefish`。

本次主机存在 vsock transport 冲突：停止容器后，确认 `vmw_vsock_vmci_transport`
使用计数为 0、没有活动 vsock socket，卸载该模块再加载 `vhost_vsock` 后恢复正常：

```bash
sudo docker stop agentos-cf
lsmod | grep -E 'vsock|vhost'
sudo ss --vsock -a
# 仅在上述无使用者条件成立且模块确实已加载时执行卸载。
sudo modprobe -r vmw_vsock_vmci_transport
sudo modprobe vhost_vsock
ls -l /dev/kvm /dev/vhost-vsock /dev/net/tun
sudo docker start agentos-cf
```

模块正在使用时先找出使用者，不强制卸载。该处理来自这台主机的实测，不是每台主机
都需要执行的通用初始化步骤。

若容器丢失但 ready 镜像与两个挂载目录仍在，可按已核对配置恢复容器（以下创建步骤
尚未在干净主机重跑；容器名称已存在时使用 `docker start`）：

```bash
sudo docker run -d --name agentos-cf --privileged --network host \
  --device /dev/kvm --device /dev/vhost-vsock --device /dev/net/tun \
  -v /mnt/aosp-out/cf-stock-16373615:/cf \
  -v /mnt/aosp-out/evidence/fallback-boot:/evidence \
  -w /cf --entrypoint /bin/sleep \
  agentos/cuttlefish-host:ubuntu24.04-ready infinity
```

成功启动使用的完整参数如下。`--resume=false` 用于本次冷启动，不承诺保留旧实例状态；
重新执行前应先保存需要保留的实例数据和日志。

```bash
sudo docker exec -w /cf agentos-cf sh -c '
  HOME=/cf ./bin/launch_cvd --daemon --resume=false \
    --vm_manager=qemu_cli --vhost_user_vsock=false \
    --report_anonymous_usage_stats=n --start_webrtc=false \
    --gpu_mode=guest_swiftshader --console=true --enable_kernel_log=true
'
sudo docker exec agentos-cf /cf/bin/adb connect 127.0.0.1:6520
sudo docker exec agentos-cf /cf/bin/adb devices -l
sudo docker exec agentos-cf /cf/bin/adb -s 127.0.0.1:6520 shell getprop sys.boot_completed
sudo docker exec agentos-cf /cf/bin/adb -s 127.0.0.1:6520 shell getprop ro.build.id
sudo docker exec agentos-cf /cf/bin/adb -s 127.0.0.1:6520 shell getprop ro.boot.hypervisor.version
```

`launch_cvd` 的成功消息需与 ADB 的 `device` 和 `sys.boot_completed=1` 一起判断。
crosvm 的 `gpu_mode=none` 与 SwiftShader 两种尝试均曾卡住，根因仍未确定；QEMU 成功
不能证明 crosvm 的问题由 GPU 导致。此次关闭 WebRTC，因此没有验证网页显示或交互。

## 保存证据

在主机新建独立目录。`kernel.log` 入口可能是符号链接，复制时使用 `docker cp -L`，
或读取实例内真实的 `logs/kernel.log`；不要把断开的符号链接当作已保存的日志。

```bash
capture=/mnt/aosp-out/evidence/fallback-boot/stock-$(date +%Y%m%d-%H%M%S)
mkdir -p "$capture"
sudo docker cp -L agentos-cf:/cf/cuttlefish/instances/cvd-1/kernel.log "$capture/kernel.log"
sudo docker cp -L agentos-cf:/cf/cuttlefish/instances/cvd-1/logs/launcher.log "$capture/launcher.log"
sudo docker cp -L agentos-cf:/cf/cuttlefish/instances/cvd-1/cuttlefish_config.json "$capture/cuttlefish_config.json"
sudo docker exec agentos-cf /cf/bin/adb devices -l > "$capture/adb-devices.txt"
sudo docker exec agentos-cf /cf/bin/adb -s 127.0.0.1:6520 shell getprop > "$capture/getprop.txt"
sudo docker exec agentos-cf /cf/bin/adb -s 127.0.0.1:6520 shell service list > "$capture/service-list.txt"
sudo docker exec agentos-cf /cf/bin/adb -s 127.0.0.1:6520 logcat -d > "$capture/logcat.log"
sudo docker inspect agentos-cf > "$capture/container.json"
```

从保留副本的本地电脑继续运行 [备份脚本](../../tools/aosp/backup-artifacts.py)，将归档
与这些证据拉取到同一已配置的 fallback 备份根目录；结束时执行 `--once`，检查
`index.json`、`SHA256SUMS` 和实际文件。成功启动日志、原始归档及容器依赖不能只留在服务器。

源码路线仍未完成：frameworks/base、Go、clang 的 archive/tree 核对已通过，但不等于
全量源码或构建已通过。`pdk,linux` 同步仍不完整，并因 `pdk` 同时包含 Darwin 项目而
带入了无关下载；当时仍在等待 Rust、misc 和 Darwin 项目。后续须明确排除 Darwin，
保存完整 resolved manifest，再继续 r34 Soong 分析与 AgentOS 镜像构建。
