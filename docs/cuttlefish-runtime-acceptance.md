# Native runtime Cuttlefish acceptance

这份 runbook 用于服务器上的 `android-15.0.0_r34` AOSP checkout。它验证同一份镜像中的 native `sideagentd`、MiniMax-M3 请求、Jev Session 选择和 daemon 重启恢复。仓库不保存任何凭据；密钥文件必须位于仓库外，并且只在验收期间存在。

## 1. 准备受保护的 secret 文件

在服务器上创建一个仓库外的文件。文件内容只允许使用下面的变量名，值由部署者在服务器终端中填写：

```text
MINIMAX_API_KEY=<MiniMax key>
MINIMAX_BASE_URL=https://api.minimax.cn/anthropic/v1/messages
MINIMAX_MODEL=MiniMax-M3
JEV_API_KEY=<Jev key>
JEV_ENDPOINT=https://omnilabs.vibeadmin.cn/v1/systemone
JEV_MODEL=jev-1.13.0
```

```bash
umask 077
install -d -m 700 /mnt/agentos-secrets
${EDITOR:-vi} /mnt/agentos-secrets/agent.env
chmod 600 /mnt/agentos-secrets/agent.env
```

不要把该文件放在 Git worktree、AOSP checkout、镜像输出目录或命令行参数中。验收脚本不会把文件内容写入报告；结束后它会删除设备上的副本，服务器上的源文件由部署者自行删除。

## 2. 构建匹配的 AgentOS Cuttlefish 镜像

```bash
cd /path/to/agenriod
AOSP=/mnt/aosp-src/aosp-r34
OUT=/mnt/aosp-out/agentos-runtime
EVIDENCE=/mnt/aosp-evidence/agentos-runtime

python3 tools/aosp/build-agentos.py "$AOSP" \
  --target cuttlefish \
  --product aosp_cf_x86_64_only_phone \
  --release trunk_staging \
  --variant userdebug \
  --out-dir "$OUT" \
  --evidence-dir "$EVIDENCE" \
  --stage all \
  -j "$(nproc)"
```

构建返回 0 后，保存 `$EVIDENCE/build-agentos.report.json`、resolved manifest、repo diff、Soong/build 日志和镜像 SHA-256。不要把 secret 文件复制到这些证据目录。

## 3. 启动设备并执行真实调用验收

使用服务器现有 Cuttlefish host runbook 启动刚构建的镜像，确认 ADB 序列号后执行：

```bash
cd /path/to/agenriod
SERIAL=127.0.0.1:6521
REPORT=/mnt/aosp-evidence/agentos-runtime/runtime-$(date -u +%Y%m%dT%H%M%SZ)

python3 tools/aosp/test-agentos-runtime.py \
  --adb /path/to/adb \
  --serial "$SERIAL" \
  --secret-file /mnt/agentos-secrets/agent.env \
  --output-dir "$REPORT"
```

脚本按顺序执行：

1. 通过 `adb root` 将 secret 文件推送到 `/data/agent/secrets/agent.env`，设置 `sideagent:sideagent` 和 `0600`，重启 `sideagentd`；
2. 调用 `cmd agentos runtime-test --auto`，让 native SessionSelector 请求 Jev，再让 native Worker 请求 MiniMax-M3；提示词要求模型返回固定 marker，报告只记录 PASS/FAIL；
3. 提交第二个请求后立即重启 `sideagentd`，读取 `runtime-snapshot`，要求看到 `recoveryRequired=true` 和任务状态 `unknown`；
4. 删除设备上的 secret 文件，并写出不含请求体、响应体、API key 的 `report.json`。

通过条件是报告中的 `status` 为 `PASS`，且 `checks` 同时包含 `jev_and_minimax=PASS` 和 `restart_recovery=PASS`。如果失败，保留构建日志、`report.json`、设备 `logcat` 和 ADB 状态；不要保留 secret 文件内容。

## 4. 可选的显式恢复检查

重启验收故意把未确认 Attempt 标为 `unknown`。在确认该请求没有外部副作用后，可以由系统前端调用 recovery resolution，或在 userdebug shell 使用：

```bash
adb -s "$SERIAL" shell cmd agentos runtime-recover SESSION_ID REQUEST_ID
adb -s "$SERIAL" shell cmd agentos runtime-snapshot SESSION_ID
```

恢复命令只会把该 Attempt 明确标为 `recovery_failed`，不会自动重放 MiniMax 请求。
