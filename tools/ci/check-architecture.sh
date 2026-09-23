#!/usr/bin/env bash
# Offline guardrail: no Android SDK, npm install or AOSP checkout required.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
python3 - <<'PYTHON'
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

errors = []
required = [
    "README.md", "AGENTS.md", "docs/system-architecture.md", "docs/migration-roadmap.md",
    "frontends/agenriod/build.gradle.kts", "system/agent/README.md",
    "system/agent/contracts/output-stream-v1.md", "system/agent/contracts/agent-bus-v1.md",
    "platform/framework/agent-manager/README.md",
    "platform/aosp-integration/README.md", "platform/product/README.md",
    "plugins/api/build.gradle.kts", "plugins/notes/build.gradle.kts",
    "libraries/file-broker/build.gradle.kts", "libraries/mcp-client/build.gradle.kts",
    "runtime/build.mjs", "tools/android/android.sh",
]
for name in required:
    if not Path(name).is_file():
        errors.append(f"Missing architecture file: {name}")

tracked = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
tracked = [p for p in tracked if p]
for name in tracked:
    path = Path(name)
    if name.startswith("platform/checkout/") and name != "platform/checkout/README.md":
        errors.append(f"AOSP checkout must not be tracked: {name}")
    if any(part in {"build", "node_modules", ".gradle", ".gradle-user-home"} for part in path.parts):
        errors.append(f"Generated/cache file must not be tracked: {name}")
    if path.name == "local.properties" or (path.name.startswith(".env") and not path.name.endswith(".example")):
        errors.append(f"Local configuration must not be tracked: {name}")
    if path.parts[0] in {"app", "plugin-api", "notes-plugin", "file-broker", "mcp-client", "scripts"}:
        errors.append(f"Legacy module path still tracked: {name}")
    if path.suffix == ".md" and path.is_file():
        for target in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", path.read_text()):
            target = target.strip("<>")
            url = urlsplit(target)
            if not url.scheme and url.path and not (path.parent / unquote(url.path)).exists():
                errors.append(f"Broken local link in {name}: {target}")

settings = Path("settings.gradle.kts").read_text()
projects = set(re.findall(r'"(:[^" ]+)"', settings))
for project in projects:
    if not Path(project[1:].replace(":", "/"), "build.gradle.kts").is_file():
        errors.append(f"Missing Gradle module: {project}")
for name in tracked:
    path = Path(name)
    if path.name == "build.gradle.kts" and path.is_file() and not name.startswith("demo-apps/"):
        for dep in re.findall(r'project\("(:[^" ]+)"\)', path.read_text()):
            if dep not in projects:
                errors.append(f"Unknown Gradle dependency in {name}: {dep}")

demo_settings = Path("demo-apps/settings.gradle.kts")
if demo_settings.is_file():
    demo_projects = set(re.findall(r'"(:[^" ]+)"', demo_settings.read_text()))
    for project in demo_projects:
        if project == ":plugin-api":
            if not Path("plugins/api/build.gradle.kts").is_file():
                errors.append("Missing shared demo Gradle module: :plugin-api")
            continue
        if not Path("demo-apps", project[1:].replace(":", "/"), "build.gradle.kts").is_file():
            errors.append(f"Missing demo Gradle module: {project}")
    for name in tracked:
        if not name.startswith("demo-apps/") or not name.endswith("build.gradle.kts"):
            continue
        for dep in re.findall(r'project\("(:[^" ]+)"\)', Path(name).read_text()):
            if dep not in demo_projects:
                errors.append(f"Unknown demo Gradle dependency in {name}: {dep}")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print("Architecture layout, local links, Gradle references and tracked-file policy OK.")
PYTHON
