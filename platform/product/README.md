# Product integration

产品接线由 `tools/aosp/wire-platform.py` 完成。它始终加入
`sideagentd`；当同时传入 `--frontend-apk` 和 `--notes-apk` 时，还会加入
`agenriod_frontend`、`agenriod_notes` 和
`agenriod_frontend_privapp_permissions`、
`agenriod_frontend_default_permissions`。

两个 APK 不提交到仓库。先通过 Gradle 生成 APK，再把路径传给接线脚本：

```bash
./tools/android/android.sh gradle \
  :frontends:agenriod:assembleDebug :plugins:notes:assembleDebug
python3 tools/aosp/wire-platform.py /path/to/aosp --apply \
  --frontend-apk frontends/agenriod/build/outputs/apk/debug/agenriod-debug.apk \
  --notes-apk plugins/notes/build/outputs/apk/debug/notes-debug.apk
```

`android_app_import` 使用 AOSP 的 `platform` 证书重新签名。Cuttlefish 和
Pixel 8 各自的 resource overlay 将 `com.example.agenriod` 设为默认
Assistant，并把长按电源键行为设为 Assistant；最终行为仍需在刷入后的
目标设备上记录 Assistant service、Secure setting 和实际按键结果。
