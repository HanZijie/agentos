#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

overlay="platform/aosp-integration/overlay"
required=(
  "$overlay/system/agent/Android.bp"
  "$overlay/system/agent/com/example/agentos/AgentHealth.aidl"
  "$overlay/system/agent/com/example/agentos/AgentPluginDescriptor.aidl"
  "$overlay/system/agent/com/example/agentos/IAgentPluginEndpoint.aidl"
  "$overlay/system/agent/com/example/agentos/IAgentManager.aidl"
  "$overlay/system/agent/com/example/agentos/ISideagentd.aidl"
  "$overlay/system/agent/sideagentd/main.cpp"
  "$overlay/system/agent/init/sideagentd.rc"
  "$overlay/system/agent/sepolicy/sideagentd.te"
  "$overlay/system/agent/sepolicy/file_contexts"
  "$overlay/system/agent/sepolicy/service_contexts"
  "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
)

for file in "${required[@]}"; do
  test -f "$file" || { echo "Missing AOSP overlay file: $file" >&2; exit 1; }
done

grep -q 'agentos.intent.action.PLUGIN_ENDPOINT' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'BIND_AUTO_CREATE' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'BIND_AGENT_PLUGIN' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'keyFor' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'ServiceManager.checkService' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'scheduleRebind' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'BINDER_FREEZE' platform/aosp-integration/aosp-todo.md
grep -q 'sideagentd' "$overlay/system/agent/init/sideagentd.rc"
grep -q 'sideagentd' "$overlay/system/agent/sepolicy/sideagentd.te"
grep -q 'agentos.sideagentd' "$overlay/system/agent/sepolicy/service_contexts"

if git ls-files platform/checkout | grep -v '^platform/checkout/README.md$' | grep -q .; then
  echo 'AOSP checkout must remain untracked' >&2
  exit 1
fi

echo 'AOSP overlay structure and discovery/freezer invariants OK.'
