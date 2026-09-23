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
  "$overlay/system/agent/sideagentd/runtime_worker.cpp"
  "$overlay/system/agent/sideagentd/session_selector.cpp"
  "$overlay/system/agent/sideagentd/secret_store.cpp"
  "$overlay/system/agent/sideagentd/https_client.cpp"
  "$overlay/system/agent/frontend/Android.bp"
  "$overlay/system/agent/frontend/privapp-permissions-agentos.xml"
  "$overlay/system/agent/frontend/default-permissions-agentos.xml"
  "$overlay/system/agent/demo/Android.bp"
  "$overlay/device/google/cuttlefish/shared/overlay/frameworks/base/core/res/res/values/agentos_config.xml"
  "$overlay/device/google/shusky/overlay/frameworks/base/core/res/res/values/agentos_config.xml"
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
grep -q 'ACCESS_AGENT' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'keyFor' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'ServiceManager.checkService' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'scheduleRebind' "$overlay/frameworks/base/services/core/java/com/android/server/agent/AgentManagerService.java"
grep -q 'sideagentd' "$overlay/system/agent/init/sideagentd.rc"
grep -q 'sideagentd' "$overlay/system/agent/sepolicy/sideagentd.te"
grep -q 'agentos.sideagentd' "$overlay/system/agent/sepolicy/service_contexts"
grep -q 'MINIMAX_API_KEY' "$overlay/system/agent/sideagentd/secret_store.cpp"
grep -q 'task.recovery_required' "$overlay/system/agent/sideagentd/main.cpp"
test -x tools/aosp/test-agentos-runtime.py

if git ls-files platform/checkout | grep -v '^platform/checkout/README.md$' | grep -q .; then
  echo 'AOSP checkout must remain untracked' >&2
  exit 1
fi

echo 'AOSP overlay structure and discovery invariants OK.'
