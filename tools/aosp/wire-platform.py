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
    args = parser.parse_args()
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
        changes[str(source.relative_to(overlay))] = source.read_text()
    # Include the stable API checksum, while skipping macOS metadata above.
    for source in overlay.rglob(".hash"):
        changes[str(source.relative_to(overlay))] = source.read_text()

    aid_header = "system/core/libcutils/include/private/android_filesystem_config.h"
    content = read(aid_header)
    if "#define AID_SIDEAGENT " not in content:
        if re.search(r"#define\s+\w+\s+1096\b", content):
            raise ValueError("AID 1096 is already allocated")
        insert(aid_header, "#define AID_SIDEAGENT ",
               "// Additions to this file must be made in AOSP",
               "#define AID_SIDEAGENT 1096 /* AgentOS daemon */\n")

    service_bp = "frameworks/base/services/core/Android.bp"
    content = read(service_bp).replace('"agentos_system_aidl-V1-java"',
                                      '"//system/agent:agentos_system_aidl-V1-java"')
    if '"//system/agent:agentos_system_aidl-V1-java"' not in content:
        start = content.index('name: "services.core.unboosted"')
        end = content.index("    static_libs: [", start) + len("    static_libs: [")
        content = content[:end] + '\n        "//system/agent:agentos_system_aidl-V1-java",' + content[end:]
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

    product_paths = (["device/google/cuttlefish/shared/device.mk"] if args.target == "cuttlefish"
                     else ["device/google/shusky/aosp_shiba.mk"])
    for path in product_paths:
        content = read(path)
        for line in ("PRODUCT_SOONG_NAMESPACES += system/agent",
                     "PRODUCT_PACKAGES += sideagentd"):
            if line not in content:
                content += "\n" + line + "\n"
        if path.startswith("device/google/cuttlefish/"):
            for artifact in ("system/bin/sideagentd", "system/etc/init/sideagentd.rc"):
                if artifact not in content:
                    content += f"\nPRODUCT_ARTIFACT_PATH_REQUIREMENT_ALLOWED_LIST += {artifact}\n"
        changes[path] = content

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
        print(f"Applied {len(changed)} files; previous files backed up under {backup}")
    else:
        print(f"Dry run: {len(changed)} files would change. Use --apply after reviewing.")


if __name__ == "__main__":
    main()
