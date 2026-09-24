#!/usr/bin/env python3
"""Wire the AgentOS overlay into android-15.0.0_r34; dry-run unless --apply."""
import argparse
import difflib
from pathlib import Path
import re
import shutil
import subprocess
import time
import xml.etree.ElementTree as ET


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("aosp_root", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--target", choices=("cuttlefish", "pixel8"), default="cuttlefish")
    parser.add_argument("--frontend-apk", type=Path,
                        help="Gradle-built Agenriod APK to sign into the product image")
    parser.add_argument("--notes-apk", type=Path,
                        help="Gradle-built Notes Plugin APK to sign into the product image")
    parser.add_argument("--demo-alarm-apk", type=Path,
                        help="Gradle-built AgentOS alarm demo APK")
    parser.add_argument("--demo-calendar-apk", type=Path,
                        help="Gradle-built AgentOS calendar demo APK")
    parser.add_argument("--demo-meeting-records-apk", type=Path,
                        help="Gradle-built AgentOS meeting-records demo APK")
    parser.add_argument("--runtime-secret-file", type=Path,
                        help="Protected env file to embed in the development image")
    args = parser.parse_args()
    if (args.frontend_apk is None) != (args.notes_apk is None):
        parser.error("--frontend-apk and --notes-apk must be supplied together")
    demo_apks = (args.demo_alarm_apk, args.demo_calendar_apk, args.demo_meeting_records_apk)
    if any(path is not None for path in demo_apks) and not all(path is not None for path in demo_apks):
        parser.error("all three demo APKs must be supplied together")
    if args.frontend_apk is not None:
        for path, label in ((args.frontend_apk, "frontend APK"), (args.notes_apk, "Notes APK")):
            if path is None:
                continue
            if not path.is_file():
                parser.error(f"{label} does not exist: {path}")
    for path, label in zip(demo_apks, ("alarm demo APK", "calendar demo APK", "meeting-records demo APK")):
        if path is not None and not path.is_file():
            parser.error(f"{label} does not exist: {path}")
    if args.runtime_secret_file is not None:
        if not args.runtime_secret_file.is_file():
            parser.error(f"runtime secret file does not exist: {args.runtime_secret_file}")
        if args.runtime_secret_file.stat().st_mode & 0o077:
            parser.error("runtime secret file must be mode 0600 or stricter")
        allowed = {
            "MINIMAX_API_KEY", "MINIMAX_BASE_URL", "MINIMAX_MODEL",
            "JEV_API_KEY", "JEV_ENDPOINT", "JEV_MODEL",
            "MINIMAX_TIMEOUT_MS", "JEV_TIMEOUT_MS",
        }
        values = {}
        for raw in args.runtime_secret_file.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                parser.error("runtime secret file contains a malformed line")
            key, value = (part.strip() for part in line.split("=", 1))
            if key not in allowed:
                parser.error(f"runtime secret file contains unsupported key: {key}")
            if not value:
                parser.error(f"runtime secret file contains an empty value: {key}")
            values[key] = value
        required = {"MINIMAX_API_KEY", "MINIMAX_BASE_URL", "MINIMAX_MODEL",
                    "JEV_API_KEY", "JEV_ENDPOINT", "JEV_MODEL"}
        missing = sorted(required - values.keys())
        if missing:
            parser.error("runtime secret file is missing required keys: " + ", ".join(missing))
    root = args.aosp_root.resolve()
    manifest = root / ".repo/manifests/default.xml"
    revision = ET.parse(manifest).getroot().find("default").get("revision")
    if revision != "refs/tags/android-15.0.0_r34":
        parser.error("This wiring is pinned to android-15.0.0_r34; review another branch first")
    projects = ["system/core", "frameworks/base", "system/sepolicy",
                "device/google/cuttlefish" if args.target == "cuttlefish" else "device/google/shusky"]
    for project in projects:
        def git_value(ref):
            return subprocess.check_output(
                ["git", "-C", str(root / project), "rev-parse", ref], text=True).strip()
        if git_value("HEAD") != git_value(revision + "^{commit}"):
            parser.error(f"{project} HEAD does not match {revision}")
    overlay = Path(__file__).resolve().parents[2] / "platform/aosp-integration/overlay"
    changes = {}
    binary_changes = {}

    def read(path):
        return changes[path] if path in changes else (root / path).read_text()

    def insert(path, marker, needle, addition):
        text = read(path)
        if marker not in text:
            if text.count(needle) != 1:
                raise ValueError(f"Ambiguous or missing insertion point: {path}")
            changes[path] = text.replace(needle, addition + needle)

    for source in sorted(overlay.rglob("*")):
        if not source.is_file() or source.name == "README.md" or source.name.startswith("."):
            continue
        relative = str(source.relative_to(overlay))
        if relative.startswith("device/google/cuttlefish/") and args.target != "cuttlefish":
            continue
        if relative.startswith("device/google/shusky/") and args.target != "pixel8":
            continue
        if relative.startswith("device/google/") and args.frontend_apk is None:
            continue
        # The product APKs are generated outside this repository. The module
        # is copied only when both APKs are staged, so a daemon-only wiring
        # remains buildable without generated frontend artifacts.
        if relative == "system/agent/frontend/Android.bp" and args.frontend_apk is None:
            continue
        if relative == "system/agent/frontend/privapp-permissions-agentos.xml" and args.frontend_apk is None:
            continue
        if relative == "system/agent/frontend/default-permissions-agentos.xml" and args.frontend_apk is None:
            continue
        if relative == "system/agent/demo/Android.bp" and not all(path is not None for path in demo_apks):
            continue
        if relative.startswith("system/agent/frontend/prebuilt/"):
            continue
        if relative.startswith("system/agent/demo/prebuilt/"):
            continue
        changes[relative] = source.read_text()
    if args.frontend_apk is not None:
        for relative, source in (
                ("system/agent/frontend/prebuilt/agenriod.apk", args.frontend_apk),
                ("system/agent/frontend/prebuilt/agenriod-notes.apk", args.notes_apk)):
            target = root / relative
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                binary_changes[relative] = source
        changes["system/agent/frontend/Android.bp"] = (
            overlay / "system/agent/frontend/Android.bp").read_text()
    if all(path is not None for path in demo_apks):
        for relative, source in (
                ("system/agent/demo/prebuilt/alarm.apk", args.demo_alarm_apk),
                ("system/agent/demo/prebuilt/calendar.apk", args.demo_calendar_apk),
                ("system/agent/demo/prebuilt/meeting-records.apk", args.demo_meeting_records_apk)):
            target = root / relative
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                binary_changes[relative] = source
        changes["system/agent/demo/Android.bp"] = (
            overlay / "system/agent/demo/Android.bp").read_text()
    if args.runtime_secret_file is not None:
        secret_bp = "system/agent/Android.bp"
        secret_content = read(secret_bp)
        secret_marker = 'name: "agentos_runtime_secret"'
        if secret_marker not in secret_content:
            secret_content += '''\n\nprebuilt_etc {\n    name: "agentos_runtime_secret",\n    src: "prebuilt/agent.env",\n    filename: "agent.env",\n    sub_dir: "agentos",\n}\n'''
            changes[secret_bp] = secret_content
        binary_changes["system/agent/prebuilt/agent.env"] = args.runtime_secret_file
        rc_path = "system/agent/init/sideagentd.rc"
        rc_content = read(rc_path)
        copy_lines = (
            "    copy /system/etc/agentos/agent.env /data/agent/secrets/agent.env\n"
            "    chown sideagent sideagent /data/agent/secrets/agent.env\n"
            "    chmod 0600 /data/agent/secrets/agent.env\n"
        )
        if "copy /system/etc/agentos/agent.env" not in rc_content:
            marker = "    restorecon_recursive /data/agent\n"
            if rc_content.count(marker) != 1:
                raise ValueError("Expected one sideagentd post-fs-data restorecon marker")
            changes[rc_path] = rc_content.replace(marker, copy_lines + marker, 1)
    # Include the stable API checksum, while skipping macOS metadata above.
    for source in overlay.rglob(".hash"):
        changes[str(source.relative_to(overlay))] = source.read_text()

    aid_header = "system/core/libcutils/include/private/android_filesystem_config.h"
    content = read(aid_header)
    if "#define AID_SIDEAGENT " not in content:
        if re.search(r"#define\s+\w+\s+1096\b", content):
            raise ValueError("AID 1096 is already allocated")
        # Anchor immediately after the complete r34 platform UID declaration.
        # Matching the full line prevents silently wiring a different branch
        # whose AID 1095 declaration has changed or is only a substring match.
        aid_needle = "#define AID_MMD 1095                 /* uid for memory management daemon */"
        if content.count(aid_needle) != 1:
            raise ValueError("Expected exactly one android-15.0.0_r34 AID_MMD declaration")
        changes[aid_header] = content.replace(
            aid_needle,
            aid_needle + "\n#define AID_SIDEAGENT 1096 /* AgentOS daemon */",
            1,
        )

    service_bp = "frameworks/base/services/core/Android.bp"
    content = read(service_bp).replace('"agentos_system_aidl-V1-java"',
                                      '"//system/agent:agentos_system_aidl-V3-java"')
    content = content.replace('"//system/agent:agentos_system_aidl-V1-java"',
                              '"//system/agent:agentos_system_aidl-V3-java"')
    content = content.replace('"//system/agent:agentos_system_aidl-V2-java"',
                              '"//system/agent:agentos_system_aidl-V3-java"')
    content = content.replace('"//system/agent:agentos_system_aidl-java"',
                              '"//system/agent:agentos_system_aidl-V3-java"')
    aidl_dep = '        "//system/agent:agentos_system_aidl-V3-java",'
    if content.count(aidl_dep) > 1:
        first = content.find(aidl_dep)
        content = content[:first + len(aidl_dep)] + content[first + len(aidl_dep):].replace(
            aidl_dep, '', 1)
    if '"//system/agent:agentos_system_aidl-V3-java"' not in content:
        start = content.index('name: "services.core.unboosted"')
        end = content.index("    static_libs: [", start) + len("    static_libs: [")
        content = content[:end] + '\n        "//system/agent:agentos_system_aidl-V3-java",' + content[end:]
    changes[service_bp] = content

    server = "frameworks/base/services/java/com/android/server/SystemServer.java"
    insert(server, "import com.android.server.agent.AgentManagerService;",
           "import com.android.server.am.ActivityManagerService;",
           "import com.android.server.agent.AgentManagerService;\n")
    insert(server, "mSystemServiceManager.startService(AgentManagerService.class);",
           "        mSystemServiceManager.updateOtherServicesStartIndex();",
           '        t.traceBegin("StartAgentManagerService");\n'
           '        mSystemServiceManager.startService(AgentManagerService.class);\n'
           '        t.traceEnd();\n')

    permission = "com.example.agentos.permission.BIND_AGENT_PLUGIN"
    insert("frameworks/base/core/res/AndroidManifest.xml", permission, "</manifest>",
           '    <!-- @hide Only the system may bind AgentOS Plugin endpoints. -->\n'
           f'    <permission android:name="{permission}"\n'
           '        android:protectionLevel="signature|privileged" />\n')
    frontend_permission = "com.example.agentos.permission.ACCESS_AGENT"
    insert("frameworks/base/core/res/AndroidManifest.xml", frontend_permission, "</manifest>",
           '    <!-- @hide Only platform-signed AgentOS frontends may create sessions. -->\n'
           f'    <permission android:name="{frontend_permission}"\n'
           '        android:protectionLevel="signature|privileged" />\n')

    # Merge into platform private policy; an unused directory in system/agent
    # alone is not enough to include any SELinux rule in the system image.
    changes["system/sepolicy/private/sideagentd.te"] = (
        overlay / "system/agent/sepolicy/sideagentd.te").read_text()
    for name in ("file_contexts", "service_contexts"):
        path = f"system/sepolicy/private/{name}"
        content = read(path)
        for line in (overlay / f"system/agent/sepolicy/{name}").read_text().splitlines():
            if not line.strip() or line.startswith("#"):
                continue
            key = line.split()[0]
            existing = [x for x in content.splitlines() if x.split()[:1] == [key]]
            if existing and any(x.split() != line.split() for x in existing):
                raise ValueError(f"Conflicting SELinux context: {key}")
            if not existing:
                content = content.rstrip() + "\n" + line + "\n"
        changes[path] = content

    test_path = "system/sepolicy/contexts/plat_file_contexts_test"
    content = read(test_path)
    for line in (overlay / "system/agent/sepolicy/file_contexts_test").read_text().splitlines():
        fields = line.split()
        if not fields or line.startswith("#"):
            continue
        existing = [row.split() for row in content.splitlines() if row.split()[:1] == fields[:1]]
        if existing and any(row != fields for row in existing):
            raise ValueError(f"Conflicting SELinux context test: {fields[0]}")
        if not existing:
            content = content.rstrip() + "\n" + line + "\n"
    changes[test_path] = content

    product_paths = (["device/google/cuttlefish/shared/device.mk"] if args.target == "cuttlefish"
                     else ["device/google/shusky/aosp_shiba.mk"])
    for path in product_paths:
        content = read(path)
        product_lines = ["PRODUCT_SOONG_NAMESPACES += system/agent",
                         "PRODUCT_PACKAGES += sideagentd",
                         "PRODUCT_PACKAGES += LatinIME"]
        if args.runtime_secret_file is not None:
            product_lines.append("PRODUCT_PACKAGES += agentos_runtime_secret")
            product_lines.append("TARGET_FS_CONFIG_GEN += system/agent/agentos.fs")
        if args.frontend_apk is not None:
            product_lines.append("PRODUCT_PACKAGES += agenriod_frontend agenriod_notes")
            product_lines.append("PRODUCT_PACKAGES += agenriod_frontend_privapp_permissions")
            product_lines.append("PRODUCT_PACKAGES += agenriod_frontend_default_permissions")
        if all(path is not None for path in demo_apks):
            product_lines.append(
                "PRODUCT_PACKAGES += agentos_demo_alarm agentos_demo_calendar agentos_demo_meeting_records")
        for line in product_lines:
            if line not in content:
                content += "\n" + line + "\n"
        # Both products install the AgentOS daemon under /system.  AOSP's
        # artifact path check otherwise treats these overlay outputs as
        # unexpected files and stops the product build before ninja starts.
        artifacts = ["system/bin/sideagentd", "system/etc/init/sideagentd.rc"]
        if args.runtime_secret_file is not None:
            artifacts.append("system/etc/agentos/agent.env")
        for artifact in artifacts:
            if artifact not in content:
                content += f"\nPRODUCT_ARTIFACT_PATH_REQUIREMENT_ALLOWED_LIST += {artifact}\n"
        changes[path] = content

    # The AgentOS product selects LONG_PRESS_POWER_ASSISTANT. The stock policy
    # turns that into Global Actions until setup completes. Preserve behavior
    # 5 on this development image so powerLongPress reaches our Activity path.
    power_path = "frameworks/base/services/core/java/com/android/server/policy/PhoneWindowManager.java"
    power_content = read(power_path) if (root / power_path).exists() else None
    if power_content is not None:
        guard_start = power_content.find("    private int getResolvedLongPressOnPowerBehavior() {")
        guard_end = power_content.find("    private void stemPrimaryPress(", guard_start)
        if guard_start < 0 or guard_end < 0:
            raise ValueError("PhoneWindowManager power behavior method changed unexpectedly")
        guard = power_content[guard_start:guard_end]
        fallback_start = guard.find("        // If the config indicates the assistant behavior")
        fallback_end = guard.find("\n        }\n", fallback_start)
        if fallback_start >= 0 and fallback_end >= 0:
            fallback_end += len("\n        }\n")
            fallback = guard[fallback_start:fallback_end]
            if "mLongPressOnPowerBehavior == LONG_PRESS_POWER_ASSISTANT" not in fallback or \
                    "return LONG_PRESS_POWER_" not in fallback:
                raise ValueError("PhoneWindowManager long-press setup guard changed unexpectedly")
            updated_guard = guard[:fallback_start] + (
                "        // AgentOS power long press remains available during setup.\n") + guard[fallback_end:]
            changes[power_path] = power_content[:guard_start] + updated_guard + power_content[guard_end:]
        elif "AgentOS power long press remains available during setup." not in guard:
            raise ValueError("PhoneWindowManager long-press setup guard changed unexpectedly")

    # The stock assistant path delegates to SystemUI and intentionally refuses
    # to launch while Setup Wizard is incomplete.  AgentOS is a development
    # image with its own front-end Activity, so make the power gesture
    # deterministic: wake the display and launch that Activity directly.  The
    # short power press remains in the stock policy and is not changed.
    # Small wiring fixtures used by the script tests do not materialize this
    # large framework source file; the real r34 checkout always does.
    if power_content is None:
        pass
    else:
        assistant_case = """            case LONG_PRESS_POWER_ASSISTANT:
                mPowerKeyHandled = true;
                performHapticFeedback(HapticFeedbackConstants.ASSISTANT_BUTTON,
                        \"Power - Long Press - Go To Assistant\");
                final int powerKeyDeviceId = INVALID_INPUT_DEVICE_ID;
                launchAssistAction(null, powerKeyDeviceId, eventTime,
                        AssistUtils.INVOCATION_TYPE_POWER_BUTTON_LONG_PRESS);
                break;"""
        agentos_case = """            case LONG_PRESS_POWER_ASSISTANT:
                mPowerKeyHandled = true;
                performHapticFeedback(HapticFeedbackConstants.ASSISTANT_BUTTON,
                        \"Power - Long Press - Go To AgentOS\");
                launchAgentosAssistant(eventTime);
                break;"""
        if assistant_case in power_content:
            updated = changes.get(power_path, power_content)
            changes[power_path] = updated.replace(assistant_case, agentos_case, 1)
        elif "launchAgentosAssistant(eventTime);" not in power_content:
            raise ValueError("PhoneWindowManager assistant case changed unexpectedly")

        updated = changes.get(power_path, power_content)
        if "private void launchAgentosAssistant(long eventTime)" not in updated:
            method_marker = "    private void launchAssistAction(String hint, int deviceId, long eventTime,\n"
            agentos_method = """    private void launchAgentosAssistant(long eventTime) {
        try {
            if (!mPowerManager.isInteractive()) {
                mPowerManager.wakeUp(eventTime, PowerManager.WAKE_REASON_POWER_BUTTON,
                        \"AGENTOS_POWER_LONG_PRESS\");
            } else {
                mPowerManager.userActivity(eventTime, false);
            }
            final Intent intent = new Intent(Intent.ACTION_MAIN)
                    .addCategory(Intent.CATEGORY_LAUNCHER)
                    .setComponent(new ComponentName(\"com.example.agenriod\",
                            \"com.example.agenriod.MainActivity\"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                            | Intent.FLAG_ACTIVITY_SINGLE_TOP
                            | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivityAsUser(intent, null, UserHandle.CURRENT_OR_SELF,
                    true /* allowDuringSetup */);
        } catch (RuntimeException e) {
            Slog.e(TAG, \"Unable to launch AgentOS assistant Activity\", e);
        }
    }

"""
            if method_marker not in updated:
                raise ValueError("PhoneWindowManager assistant method marker changed unexpectedly")
            changes[power_path] = updated.replace(method_marker, agentos_method + method_marker, 1)

    changed = {}
    for path, content in changes.items():
        target = root / path
        old = target.read_text() if target.exists() else ""
        if old != content:
            changed[path] = content
            if not args.apply:
                print("".join(difflib.unified_diff(old.splitlines(True), content.splitlines(True),
                                                 fromfile=path, tofile=path)), end="")
    if args.apply:
        # Keep Android.bp backups outside the source tree: Soong discovers them
        # recursively even below hidden directories, causing duplicate modules.
        backup = root.parent / "agentos-wiring-backups" / str(time.time_ns())
        for path, content in changed.items():
            target = root / path
            if target.exists():
                saved = backup / path
                saved.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, saved)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
        for path, source in binary_changes.items():
            target = root / path
            if target.exists():
                saved = backup / path
                saved.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, saved)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        print(f"Applied {len(changed)} files and {len(binary_changes)} APKs; previous files backed up under {backup}")
    else:
        if binary_changes:
            print("Would stage: " + ", ".join(binary_changes))
        print(f"Dry run: {len(changed)} files would change. Use --apply after reviewing.")


if __name__ == "__main__":
    main()
