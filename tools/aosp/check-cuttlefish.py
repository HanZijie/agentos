#!/usr/bin/env python3
"""Read-only Cuttlefish boot and AgentOS Binder health verification over SSH.

Example:
  python3 tools/aosp/check-cuttlefish.py --host agentos-aosp \
    --container agentos-cf --sudo-docker --adb /cf/bin/adb \
    --serial 127.0.0.1:6520 --mode stock --output-dir ../.local/cf-check

The output directory must be new. Stock PASS proves Android boot only; it does
not prove AgentOS integration. AgentOS mode additionally requires both Binder
services and a successful ready health response. Neither mode tests Plugin
lifecycle or freezer behavior. No guest writes, installs, root transitions,
connections, or restarts are performed. An already connected ADB device is
required. Exit 0 means all applicable checks passed; exit 1 means failure.
"""

import argparse
import datetime
import json
from pathlib import Path
import re
import shlex
import subprocess
import time


SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
               "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=5",
               "-o", "ServerAliveCountMax=2"]
CHECKS = {
    "adb_state": ["get-state"],
    "boot_completed": ["shell", "getprop sys.boot_completed"],
    "system_server": ["shell", "pidof system_server"],
    "selinux": ["shell", "getenforce"],
    "fingerprint": ["shell", "getprop ro.build.fingerprint"],
    "agentos_service": ["shell", "service check agentos"],
    "sideagentd_service": ["shell", "service check agentos.sideagentd"],
    "agentos_health": ["shell", "cmd agentos health"],
}


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class RemoteAdb:
    def __init__(self, host, serial, adb="adb", container=None,
                 sudo_docker=False, timeout=20):
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.@:-]*", host):
            raise ValueError("host must be an SSH alias or hostname, not options")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:/\[\]-]*", serial):
            raise ValueError("serial must be an explicit ADB device serial")
        if container and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", container):
            raise ValueError("invalid Docker container name")
        if not adb or adb.startswith("-") or any(ord(c) < 32 for c in adb):
            raise ValueError("invalid ADB executable")
        if sudo_docker and not container:
            raise ValueError("--sudo-docker requires --container")
        if not 1 <= timeout <= 300:
            raise ValueError("timeout must be between 1 and 300 seconds")
        self.host, self.serial, self.adb = host, serial, adb
        self.container, self.sudo_docker, self.timeout = container, sudo_docker, timeout

    def command(self, name):
        # SSH invokes a remote shell. Quote every outer argv token; the guest
        # shell receives only one of the fixed, read-only commands above.
        remote = ["timeout", "--signal=TERM", "--kill-after=3s", str(self.timeout) + "s"]
        if self.container:
            if self.sudo_docker:
                remote += ["sudo", "-n"]
            remote += ["docker", "exec", self.container]
        remote += [self.adb, "-s", self.serial, *CHECKS[name]]
        return ["ssh", *SSH_OPTIONS, self.host, shlex.join(remote)]

    def run(self, name):
        command = self.command(name)
        start = time.monotonic()
        try:
            result = subprocess.run(command, stdin=subprocess.DEVNULL,
                                    capture_output=True, text=True,
                                    timeout=self.timeout + 20, check=False)
            returncode, stdout, stderr = result.returncode, result.stdout, result.stderr
            timed_out = returncode in (124, 137)
        except subprocess.TimeoutExpired as exc:
            returncode, timed_out = None, True
            stdout, stderr = exc.stdout or "", exc.stderr or ""
        except OSError as exc:
            returncode, timed_out, stdout, stderr = None, False, "", str(exc)
        if isinstance(stdout, bytes):
            stdout = stdout.decode("utf-8", errors="replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", errors="replace")
        return {"command": command, "returncode": returncode, "stdout": stdout,
                "stderr": stderr, "timed_out": timed_out,
                "elapsed_seconds": round(time.monotonic() - start, 3)}


def validate(name, result, mode, expected_fingerprint=None):
    if result["timed_out"]:
        return "FAIL", "command timed out"
    if result["returncode"] != 0:
        return "FAIL", "command failed (exit %s)" % result["returncode"]
    value = result["stdout"].strip()
    if name == "adb_state":
        passed = value == "device"
    elif name == "boot_completed":
        passed = value == "1"
    elif name == "system_server":
        passed = bool(re.fullmatch(r"[1-9][0-9]*(?:\s+[1-9][0-9]*)*", value))
    elif name == "selinux":
        passed = value == "Enforcing"
    elif name == "fingerprint":
        passed = bool(re.fullmatch(r"[^/\s]+/[^/\s]+/[^:\s]+:[^/\s]+/[^/\s]+/[^:\s]+:[^/\s]+/[^/\s]+", value))
        if expected_fingerprint is not None:
            passed = passed and value == expected_fingerprint
    elif name in ("agentos_service", "sideagentd_service"):
        service = "agentos" if name == "agentos_service" else "agentos.sideagentd"
        if value == "Service %s: not found" % service and mode == "stock":
            return "ABSENT_ALLOWED", "not present; stock mode does not require AgentOS"
        passed = value == "Service %s: found" % service
    elif name == "agentos_health":
        try:
            health = json.loads(value)
            passed = (isinstance(health, dict) and health.get("state") == "ready"
                      and type(health.get("protocolVersion")) is int
                      and health["protocolVersion"] == 1
                      and type(health.get("startedAtMs")) is int
                      and health["startedAtMs"] > 0)
        except (ValueError, TypeError):
            passed = False
    else:
        raise ValueError("unknown check: " + name)
    return ("PASS", "expected response observed") if passed else ("FAIL", "unexpected response")


def verify(remote, mode, output_dir, expected_fingerprint=None):
    if mode not in ("stock", "agentos"):
        raise ValueError("mode must be stock or agentos")
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=False)
    report = {"schema_version": 1, "started_at": utc_now(), "mode": mode,
              "scope": "android_boot" if mode == "stock" else "android_boot_and_agentos_health",
              "target": {"ssh_host": remote.host, "container": remote.container,
                         "adb": remote.adb, "serial": remote.serial},
              "expected_fingerprint": expected_fingerprint,
              "limitations": ["Plugin lifecycle is not tested", "Freezer behavior is not tested",
                              "Stock mode does not prove AgentOS integration"], "checks": {}}

    def check(name):
        result = remote.run(name)
        status, reason = validate(name, result, mode, expected_fingerprint)
        for stream in ("stdout", "stderr"):
            (output_dir / (name + "." + stream + ".txt")).write_text(result[stream], encoding="utf-8")
        report["checks"][name] = {**result, "status": status, "reason": reason}

    # Do not keep issuing guest requests to an unavailable or unauthorized ADB
    # device. A connection failure is a failed report, never skipped success.
    check("adb_state")
    if report["checks"]["adb_state"]["status"] == "PASS":
        for name in ("boot_completed", "system_server", "selinux", "fingerprint",
                     "agentos_service", "sideagentd_service"):
            check(name)
        if mode == "agentos" or any(report["checks"][name]["status"] == "PASS"
                                     for name in ("agentos_service", "sideagentd_service")):
            check("agentos_health")
        else:
            report["checks"]["agentos_health"] = {"status": "NOT_RUN",
                "reason": "no AgentOS service found; health is not part of stock boot acceptance"}
    report["status"] = "FAIL" if any(c["status"] == "FAIL" for c in report["checks"].values()) else "PASS"
    report["finished_at"] = utc_now()
    temporary = output_dir / "report.json.tmp"
    temporary.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(output_dir / "report.json")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", required=True)
    parser.add_argument("--serial", required=True)
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--container")
    parser.add_argument("--sudo-docker", action="store_true")
    parser.add_argument("--mode", choices=("stock", "agentos"), required=True)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--expected-fingerprint")
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        remote = RemoteAdb(args.host, args.serial, args.adb, args.container,
                           args.sudo_docker, args.timeout)
        report = verify(remote, args.mode, args.output_dir, args.expected_fingerprint)
    except (ValueError, OSError) as exc:
        parser.exit(1, "Verification could not run: %s\n" % exc)
    print("%s (%s): %s" % (report["status"], report["scope"], args.output_dir / "report.json"))
    for name, result in report["checks"].items():
        print("  %s: %s — %s" % (name, result["status"], result["reason"]))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
