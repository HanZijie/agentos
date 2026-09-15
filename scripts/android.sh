#!/usr/bin/env bash
# Project-local Android tools; no changes to the user's shell profile are needed.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

fail() { printf '%s\n' "$*" >&2; exit 1; }

usage() {
    cat <<'HELP'
Usage: ./scripts/android.sh <command> [arguments]
  doctor               Show SDK, Java, AVDs and connected devices
  start                Start or reuse the selected AVD; wait for Android to boot
  build                Build the debug APK
  run                  Start AVD, build, install and launch the app
  configure-model      Import local Anthropic settings into an installed debug app
  logs [logcat args]    Stream logs from the running app (-d for a snapshot)
  crashes              Read Android's crash buffer
  screenshot [path]    Save a PNG (default: build/codex/screenshot.png)
  ui [path]            Save UI hierarchy (default: build/codex/ui.xml)
  adb <arguments>      Run ADB on the selected device (e.g. shell input tap X Y)
  gradle <arguments>   Run the project's Gradle wrapper with the Android JDK
  instrumentation      Build/install the Notes plugin and run device tests

Optional overrides: ANDROID_AVD (default Pixel_8a), ANDROID_SERIAL,
ANDROID_HOME, JAVA_HOME, ANDROID_APP_ID, ANDROID_ACTIVITY,
ANTHROPIC_ENV_FILE (default .env.anthropic.local).
HELP
}

COMMAND="${1:-help}"
if [[ "$COMMAND" == help || "$COMMAND" == --help || "$COMMAND" == -h ]]; then
    usage
    exit 0
fi
shift

SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$SDK_DIR" && -f local.properties ]]; then
    SDK_DIR="$(sed -n 's/^sdk\.dir=//p' local.properties | tr -d '\r')"
fi
SDK_DIR="${SDK_DIR:-$HOME/Library/Android/sdk}"
ADB="$SDK_DIR/platform-tools/adb"
EMULATOR="$SDK_DIR/emulator/emulator"
[[ -x "$ADB" ]] || fail "ADB not found: $ADB. Set ANDROID_HOME to your Android SDK."
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"

if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME:-}/bin/java" ]]; then
    STUDIO_JDK='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
    if [[ -x "$STUDIO_JDK/bin/java" ]]; then
        export JAVA_HOME="$STUDIO_JDK"
    elif [[ -x /usr/libexec/java_home ]]; then
        JAVA_HOME="$(/usr/libexec/java_home 2>/dev/null || true)"
        export JAVA_HOME
    fi
fi
export PATH="${JAVA_HOME:+$JAVA_HOME/bin:}$SDK_DIR/platform-tools:$SDK_DIR/emulator:$PATH"

AVD_NAME="${ANDROID_AVD:-Pixel_8a}"
APP_ID="${ANDROID_APP_ID:-com.example.agenriod}"
ACTIVITY="${ANDROID_ACTIVITY:-$APP_ID/.MainActivity}"
SERIAL="${ANDROID_SERIAL:-}"
OUTPUT_DIR="$PROJECT_ROOT/build/codex"
MODEL_ENV_FILE="${ANTHROPIC_ENV_FILE:-$PROJECT_ROOT/.env.anthropic.local}"
MODEL_CONFIG_FILE=''
TEST_RUNNER="$APP_ID.test/com.example.agenriod.testing.LocalModelTestRunner"

gradle() {
    [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]] || fail 'No JDK found. Set JAVA_HOME to a compatible JDK.'
    # Agent sandbox shells inject a broken javaagent via JAVA_TOOL_OPTIONS and
    # block dual-stack (IPv6) loopback sockets, which breaks client->daemon,
    # worker->daemon and ddmlib->adb IPC. Overriding JAVA_TOOL_OPTIONS forces
    # IPv4 in every spawned JVM (daemon, test workers, UTP) and drops the agent.
    export JAVA_TOOL_OPTIONS="-Djava.net.preferIPv4Stack=true"
    mkdir -p "$PROJECT_ROOT/build/tmpdir"
    export GRADLE_OPTS="-Djava.net.preferIPv4Stack=true ${GRADLE_OPTS:-}"
    # Project-local Gradle home: sandboxed shells cannot rename/delete inside
    # ~/.gradle, which Gradle's temp-file and cache semantics require.
    export GRADLE_USER_HOME="$PROJECT_ROOT/.gradle-user-home"
    ./gradlew --console=plain \
        "-Dorg.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8 -Djava.net.preferIPv4Stack=true -Djava.io.tmpdir=$PROJECT_ROOT/build/tmpdir" \
        "$@"
}

build_agent() {
    command -v node >/dev/null 2>&1 || fail 'Node.js is required to bundle the pi runtime. Run node runtime/build.mjs manually.'
    node runtime/build.mjs
}

cleanup_model_config() {
    if [[ -n "$MODEL_CONFIG_FILE" ]]; then
        "$ADB" -s "$SERIAL" shell rm -f "$MODEL_CONFIG_FILE" >/dev/null 2>&1 || true
        MODEL_CONFIG_FILE=''
    fi
}

stage_model_config() {
    MODEL_CONFIG_FILE="$(node "$PROJECT_ROOT/scripts/anthropic-env.mjs" stage "$ADB" "$SERIAL" "$MODEL_ENV_FILE")"
}

import_installed_model_config() {
    if [[ "$(node "$PROJECT_ROOT/scripts/anthropic-env.mjs" check "$MODEL_ENV_FILE")" != configured ]]; then
        printf 'Local Anthropic settings skipped (empty key or missing file).\n'
        return
    fi
    gradle :app:assembleDebugAndroidTest "$@"
    "$ADB" -s "$SERIAL" install -r "$PROJECT_ROOT/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk"
    "$ADB" -s "$SERIAL" shell am force-stop "$APP_ID"
    trap cleanup_model_config EXIT
    stage_model_config
    [[ -n "$MODEL_CONFIG_FILE" ]] || return
    local import_output
    if ! import_output="$("$ADB" -s "$SERIAL" shell am instrument -w \
        -e modelConfigFile "$MODEL_CONFIG_FILE" -e modelSetupOnly true "$TEST_RUNNER" 2>&1)"; then
        fail 'Local Anthropic configuration import failed.'
    fi
    [[ "$import_output" == *MODEL_CONFIG_APPLIED* ]] || fail 'Local Anthropic configuration was not applied. Check the environment file and debug installation.'
    cleanup_model_config
    trap - EXIT
    printf 'Local Anthropic settings imported into encrypted app storage. No model request sent.\n'
}

find_device() {
    local candidate name
    local matches=()
    while read -r candidate; do
        [[ -n "$candidate" ]] || continue
        name="$("$ADB" -s "$candidate" emu avd name 2>/dev/null | tr -d '\r' | head -n 1 || true)"
        [[ "$name" != "$AVD_NAME" ]] || matches+=("$candidate")
    done < <("$ADB" devices | awk '$1 ~ /^emulator-/ && $2 == "device" {print $1}')
    if [[ ${#matches[@]} -gt 1 ]]; then
        fail "More than one $AVD_NAME device is online. Set ANDROID_SERIAL explicitly."
    elif [[ ${#matches[@]} -eq 1 ]]; then
        SERIAL="${matches[0]}"
    fi
}

require_device() {
    "$ADB" start-server
    [[ -n "$SERIAL" ]] || find_device
    [[ -n "$SERIAL" ]] || fail "No online $AVD_NAME found. Run ./scripts/android.sh start first."
    [[ "$("$ADB" -s "$SERIAL" get-state)" == device ]] || fail "Device $SERIAL is not ready."
}

start_device() {
    "$ADB" start-server
    local launched_pid='' deadline
    if [[ -z "$SERIAL" ]]; then
        find_device
        if [[ -z "$SERIAL" ]]; then
            [[ -x "$EMULATOR" ]] || fail "Emulator not found: $EMULATOR"
            "$EMULATOR" -list-avds | tr -d '\r' | grep -Fxq "$AVD_NAME" || fail "AVD does not exist: $AVD_NAME"
            mkdir -p "$OUTPUT_DIR"
            printf 'Starting %s; log: %s/emulator.log\n' "$AVD_NAME" "$OUTPUT_DIR"
            nohup "$EMULATOR" -avd "$AVD_NAME" >"$OUTPUT_DIR/emulator.log" 2>&1 < /dev/null &
            launched_pid=$!
        fi
    fi
    deadline=$((SECONDS + 180))
    while (( SECONDS < deadline )); do
        [[ -n "$SERIAL" ]] || find_device
        if [[ -n "$SERIAL" ]] && [[ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)" == 1 ]]; then
            printf 'Ready: %s (%s)\n' "$SERIAL" "$AVD_NAME"
            return
        fi
        if [[ -n "$launched_pid" ]] && ! kill -0 "$launched_pid" 2>/dev/null; then
            tail -n 30 "$OUTPUT_DIR/emulator.log" >&2
            fail 'Emulator exited before Android finished booting.'
        fi
        sleep 2
    done
    fail "Device did not boot within 180 seconds. Inspect $OUTPUT_DIR/emulator.log and adb devices."
}

case "$COMMAND" in
    doctor)
        printf 'Project: %s\nSDK: %s\nJAVA_HOME: %s\nAVD: %s\n' "$PROJECT_ROOT" "$SDK_DIR" "${JAVA_HOME:-unset}" "$AVD_NAME"
        java -version
        "$ADB" version
        "$EMULATOR" -list-avds
        "$ADB" devices -l
        ;;
    start) start_device ;;
    build) build_agent; gradle :app:assembleDebug "$@" ;;
    run)
        start_device
        build_agent
        gradle :app:assembleDebug "$@"
        "$ADB" -s "$SERIAL" install -r "$PROJECT_ROOT/app/build/outputs/apk/debug/app-debug.apk"
        import_installed_model_config "$@"
        "$ADB" -s "$SERIAL" shell am start -W -S -n "$ACTIVITY"
        ;;
    configure-model)
        require_device
        "$ADB" -s "$SERIAL" shell run-as "$APP_ID" true >/dev/null 2>&1 || fail 'Install the debug app first with ./scripts/android.sh run.'
        import_installed_model_config "$@"
        "$ADB" -s "$SERIAL" shell am start -W -S -n "$ACTIVITY"
        ;;
    instrumentation)
        start_device
        build_agent
        gradle :notes-plugin:assembleDebug :app:assembleDebugAndroidTest "$@"
        "$ADB" -s "$SERIAL" install -r "$PROJECT_ROOT/notes-plugin/build/outputs/apk/debug/notes-plugin-debug.apk"
        mkdir -p "$OUTPUT_DIR"
        FIXTURE_LOG="$OUTPUT_DIR/mcp-sdk-fixture.log"
        FIXTURE_PID=''
        cleanup_fixture() {
            cleanup_model_config
            if [[ -n "$FIXTURE_PID" ]]; then
                kill "$FIXTURE_PID" 2>/dev/null || true
                wait "$FIXTURE_PID" 2>/dev/null || true
            fi
        }
        trap cleanup_fixture EXIT
        stage_model_config
        model_args=()
        if [[ -n "$MODEL_CONFIG_FILE" ]]; then
            model_args+=("-Pandroid.testInstrumentationRunnerArguments.modelConfigFile=$MODEL_CONFIG_FILE")
        fi
        node "$PROJECT_ROOT/runtime/mcp-sdk-fixture.mjs" >"$FIXTURE_LOG" 2>&1 &
        FIXTURE_PID=$!
        fixture_port=''
        for _ in $(seq 1 50); do
            fixture_port="$(sed -n 's/^PORT=//p' "$FIXTURE_LOG" | head -n 1)"
            [[ -n "$fixture_port" ]] && break
            sleep 0.1
        done
        [[ -n "$fixture_port" ]] || fail "MCP SDK fixture did not start; inspect $FIXTURE_LOG"
        "$ADB" -s "$SERIAL" reverse "tcp:$fixture_port" "tcp:$fixture_port" >/dev/null
        if gradle :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.port=$fixture_port" "${model_args[@]}" "$@"; then
            status=0
        else
            status=$?
        fi
        trap - EXIT
        cleanup_fixture
        exit "$status"
        ;;
    logs)
        require_device
        APP_PID="$("$ADB" -s "$SERIAL" shell pidof -s "$APP_ID" | tr -d '\r' || true)"
        [[ -n "$APP_PID" ]] || fail "App is not running. Use run, or crashes for crash logs."
        exec "$ADB" -s "$SERIAL" logcat --pid="$APP_PID" -v threadtime "$@"
        ;;
    crashes)
        require_device
        exec "$ADB" -s "$SERIAL" logcat -b crash -d -v threadtime
        ;;
    screenshot)
        require_device
        DESTINATION="${1:-$OUTPUT_DIR/screenshot.png}"
        mkdir -p "$(dirname "$DESTINATION")"
        "$ADB" -s "$SERIAL" exec-out screencap -p > "$DESTINATION"
        printf 'Screenshot: %s\n' "$DESTINATION"
        ;;
    ui)
        require_device
        DESTINATION="${1:-$OUTPUT_DIR/ui.xml}"
        mkdir -p "$(dirname "$DESTINATION")"
        "$ADB" -s "$SERIAL" shell uiautomator dump /sdcard/agenriod-window.xml
        "$ADB" -s "$SERIAL" pull /sdcard/agenriod-window.xml "$DESTINATION"
        "$ADB" -s "$SERIAL" shell rm /sdcard/agenriod-window.xml
        ;;
    adb)
        require_device
        exec "$ADB" -s "$SERIAL" "$@"
        ;;
    gradle) gradle "$@" ;;
    *) usage >&2; fail "Unknown command: $COMMAND" ;;
esac
