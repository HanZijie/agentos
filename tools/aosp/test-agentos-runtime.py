#!/usr/bin/env python3
"""Exercise the native sideagentd runtime on a running Cuttlefish device.

The script provisions credentials through a short-lived local file, runs one
automatic Session selection plus MiniMax request, restarts sideagentd, and
checks that an in-flight request is fenced as recovery_required. Secret values
are read from the environment or a deployment-only file and are never written
to the report or passed as command-line arguments.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from typing import Any


def run(adb: str, serial: str, args: list[str], timeout: int = 30,
        input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run([adb, "-s", serial, *args], input=input_text,
                          capture_output=True, text=True, timeout=timeout,
                          check=False)


def require(result: subprocess.CompletedProcess[str], label: str) -> str:
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"{label} failed (exit {result.returncode}): {detail[:300]}")
    return result.stdout


def read_secrets(path: Path | None) -> dict[str, str]:
    values: dict[str, str] = {}
    if path is not None:
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("\"'")
    for key in ("MINIMAX_API_KEY", "MINIMAX_BASE_URL", "MINIMAX_MODEL",
                "JEV_API_KEY", "JEV_ENDPOINT", "JEV_MODEL"):
        if os.environ.get(key):
            values[key] = os.environ[key]
    required = ("MINIMAX_API_KEY", "JEV_API_KEY")
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise RuntimeError("missing deployment secret(s): " + ", ".join(missing))
    values.setdefault("MINIMAX_BASE_URL", "https://api.minimax.cn/anthropic/v1/messages")
    values.setdefault("MINIMAX_MODEL", "MiniMax-M3")
    values.setdefault("JEV_ENDPOINT", "https://omnilabs.vibeadmin.cn/v1/systemone")
    values.setdefault("JEV_MODEL", "jev-1.13.0")
    return values


def json_lines(output: str) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = []
    for line in output.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            values.append(value)
    return values


def wait_health(adb: str, serial: str, timeout: int) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = run(adb, serial, ["shell", "cmd", "agentos", "health"], timeout=10)
        if result.returncode == 0:
            try:
                if json.loads(result.stdout).get("state") == "ready":
                    return
            except json.JSONDecodeError:
                pass
        time.sleep(1)
    raise RuntimeError("sideagentd did not become ready")


def provision(adb: str, serial: str, values: dict[str, str]) -> None:
    # ADB root is expected on a userdebug Cuttlefish image. The secret file is
    # deleted by the caller after the test and never enters the repo/image zip.
    require(run(adb, serial, ["root"], timeout=20), "adb root")
    require(run(adb, serial, ["shell", "mkdir", "-p", "/data/agent/secrets"], timeout=10),
            "secret directory")
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as stream:
        local = Path(stream.name)
        for key, value in values.items():
            stream.write(f"{key}={value}\n")
        stream.flush()
    try:
        require(run(adb, serial, ["push", str(local), "/data/agent/secrets/agent.env"], timeout=30),
                "secret push")
    finally:
        local.unlink(missing_ok=True)
    require(run(adb, serial, ["shell", "chown", "sideagent:sideagent", "/data/agent/secrets/agent.env"], timeout=10),
            "secret owner")
    require(run(adb, serial, ["shell", "chmod", "600", "/data/agent/secrets/agent.env"], timeout=10),
            "secret permissions")
    require(run(adb, serial, ["shell", "restorecon", "/data/agent/secrets/agent.env"], timeout=10),
            "secret label")
    require(run(adb, serial, ["shell", "stop", "sideagentd"], timeout=10), "stop sideagentd")
    require(run(adb, serial, ["shell", "start", "sideagentd"], timeout=10), "start sideagentd")


def remove_secret(adb: str, serial: str) -> None:
    run(adb, serial, ["shell", "rm", "-f", "/data/agent/secrets/agent.env"], timeout=10)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--serial", default="127.0.0.1:6520")
    parser.add_argument("--secret-file", type=Path,
                        help="deployment-only env file; values are never reported")
    parser.add_argument("--marker", default="AGENTOS_NATIVE_RUNTIME_OK")
    parser.add_argument("--timeout", type=int, default=240)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if args.timeout < 30:
        parser.error("--timeout must be at least 30 seconds")
    report: dict[str, Any] = {"schema": 1, "serial": args.serial,
                              "status": "FAIL", "checks": {}}
    args.output_dir.mkdir(parents=True, exist_ok=False)
    try:
        values = read_secrets(args.secret_file)
    except Exception:
        report["error"] = "secret configuration unavailable"
        (args.output_dir / "report.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"{report['status']}: {args.output_dir / 'report.json'}")
        return 1
    failure: str | None = None
    try:
        require(run(args.adb, args.serial, ["get-state"], timeout=15), "adb connection")
        provision(args.adb, args.serial, values)
        wait_health(args.adb, args.serial, 30)
        report["checks"]["health_after_secret_provision"] = "PASS"

        prompt = f"Reply with exactly {args.marker} and nothing else."
        result = run(args.adb, args.serial,
                     ["shell", "cmd", "agentos", "runtime-test", "--auto", prompt],
                     timeout=args.timeout)
        output = result.stdout
        lines = json_lines(output)
        completed = any(task.get("state") == "completed" and
                        args.marker in str(item.get("latestAnswer", ""))
                        for item in lines for task in item.get("tasks", [])
                        if isinstance(task, dict))
        if result.returncode != 0 or not completed:
            raise RuntimeError("runtime-test did not return the expected completed marker")
        report["checks"]["jev_and_minimax"] = "PASS"

        queued = require(run(args.adb, args.serial,
                             ["shell", "cmd", "agentos", "runtime-test", "--no-wait", prompt],
                             timeout=30), "queue recovery request")
        receipts = json_lines(queued)
        receipt = next((item for item in receipts if item.get("taskId") and item.get("sessionId")), None)
        if receipt is None:
            raise RuntimeError("runtime-test did not return a task receipt")
        require(run(args.adb, args.serial, ["shell", "stop", "sideagentd"], timeout=10), "restart stop")
        require(run(args.adb, args.serial, ["shell", "start", "sideagentd"], timeout=10), "restart start")
        wait_health(args.adb, args.serial, 30)
        snapshot = require(run(args.adb, args.serial,
                               ["shell", "cmd", "agentos", "runtime-snapshot", receipt["sessionId"]],
                               timeout=20), "recovery snapshot")
        snapshots = json_lines(snapshot)
        recovery = any(item.get("recoveryRequired") is True and
                       any(task.get("state") == "unknown" for task in item.get("tasks", [])
                           if isinstance(task, dict)) for item in snapshots)
        if not recovery:
            raise RuntimeError("sideagentd restart did not fence the in-flight task")
        report["checks"]["restart_recovery"] = "PASS"
        report["status"] = "PASS"
    except Exception:
        # Do not persist command output or exception text: a provider/ADB
        # diagnostic must never become a side channel for credentials.
        failure = "runtime acceptance failed"
    finally:
        remove_secret(args.adb, args.serial)
    if failure is not None:
        report["error"] = failure
    (args.output_dir / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"{report['status']}: {args.output_dir / 'report.json'}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
