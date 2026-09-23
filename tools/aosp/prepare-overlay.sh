#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AOSP_ROOT="${AOSP_ROOT:-}"
if [[ -z "$AOSP_ROOT" || ! -d "$AOSP_ROOT/.repo" ]]; then
  echo 'Set AOSP_ROOT to an initialized, synced AOSP checkout.' >&2
  exit 2
fi

if [[ "${ALLOW_DIRTY_AOSP:-0}" != 1 ]]; then
  if ! command -v repo >/dev/null 2>&1; then
    echo 'repo is required to verify AOSP child repositories; set ALLOW_DIRTY_AOSP=1 only after saving its state.' >&2
    exit 2
  fi
  if ! dirty="$(cd "$AOSP_ROOT" && repo forall -c 'git status --porcelain' 2>/dev/null)"; then
    echo 'Unable to inspect AOSP child repositories; set ALLOW_DIRTY_AOSP=1 only after reviewing the checkout.' >&2
    exit 2
  fi
  if [[ -n "$dirty" ]]; then
    echo 'AOSP checkout has dirty child repositories; set ALLOW_DIRTY_AOSP=1 only after saving its state.' >&2
    exit 2
  fi
fi

overlay="$ROOT/platform/aosp-integration/overlay"
while IFS= read -r -d '' source; do
  relative="${source#"$overlay/"}"
  if [[ "$relative" == "system/agent/frontend/Android.bp" ||
        "$relative" == system/agent/frontend/prebuilt/* ||
        "$relative" == system/agent/frontend/privapp-permissions-agentos.xml ||
        "$relative" == system/agent/frontend/default-permissions-agentos.xml ||
        "$relative" == device/google/* ]]; then
    continue
  fi
  destination="$AOSP_ROOT/$relative"
  mkdir -p "$(dirname "$destination")"
  if [[ -e "$destination" ]]; then
    if cmp -s "$source" "$destination"; then
      continue
    fi
    if [[ "${ALLOW_OVERWRITE_AOSP:-0}" != 1 ]]; then
      echo "Refusing to overwrite existing AOSP file: $destination" >&2
      echo 'Set ALLOW_OVERWRITE_AOSP=1 only after reviewing the diff.' >&2
      exit 2
    fi
  fi
  cp "$source" "$destination"
done < <(find "$overlay" -type f ! -name README.md -print0 | sort -z)

echo "Copied AgentOS bootstrap overlay into $AOSP_ROOT"
echo 'Next: add PRODUCT_SOONG_NAMESPACES for the overlay, add PRODUCT_PACKAGES=sideagentd, allocate the sideagent AID, and wire SystemServer.'
