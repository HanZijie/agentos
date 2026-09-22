#!/usr/bin/env python3
"""Observe one ordinary Android app's natural cached-app freezer cycle.

This is a stock-device observation tool.  It never calls ``cmd activity
freeze`` and never changes DeviceConfig or Settings.  It starts the requested
activity, sends HOME, and waits for the *same PID* to become frozen naturally.
After that it starts the activity again and requires that PID to be unfrozen.
The result is deliberately limited to app-process behaviour; it is not proof
of an AgentOS system-service session or of a Plugin binding exemption.

The ADB executable can be wrapped by passing a JSON argv prefix. Use the
explicit SSH wrapper for a remote host, for example::

    --ssh-host agentos-aosp
    --adb-prefix '["sudo", "-n", "docker", "exec", "agentos-cf", "/cf/bin/adb"]'

No local shell is used. ADB invokes a guest shell, and SSH invokes a remote
shell; each shell boundary is separately quoted with shlex.join. The prefix
must forward argv unchanged (for example, docker exec); do not put ssh or a
shell command interpreter in it. A successful run leaves the activity in
the foreground; it does not restore whichever app was previously foreground.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
import re
import shlex
import subprocess
import time
from typing import Any, Iterable


COMMAND_TIMEOUT_SECONDS = 20
POLL_SECONDS = 2
PACKAGE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$")
PID_RE = re.compile(r"[1-9][0-9]*")
SERIAL_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:/\[\]-]*")
SSH_HOST_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.@:-]*")
SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
               "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=5",
               "-o", "ServerAliveCountMax=2"]


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def parse_argv_prefix(value: str) -> list[str]:
    """Parse and validate the JSON argv prefix used to invoke ADB."""
    try:
        prefix = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError("--adb-prefix must be a JSON array of strings") from exc
    if not isinstance(prefix, list) or not prefix or any(
            not isinstance(item, str) or not item or "\x00" in item for item in prefix):
        raise ValueError("--adb-prefix must be a non-empty JSON array of strings")
    return validate_argv_prefix(prefix)


def validate_argv_prefix(prefix: Iterable[str]) -> list[str]:
    prefix = list(prefix)
    if not prefix or any(not isinstance(item, str) or not item
                         or any(ord(char) < 32 for char in item) for item in prefix):
        raise ValueError("--adb-prefix must be a non-empty JSON array of non-control strings")
    if any(Path(item).name in ("ssh", "ssh.exe", "sh", "bash", "zsh", "dash", "fish")
           for item in prefix):
        raise ValueError("--adb-prefix must preserve argv; use --ssh-host instead of ssh or a shell")
    return prefix


def validate_serial(value: str) -> str:
    if not SERIAL_RE.fullmatch(value):
        raise ValueError("--serial must be an explicit ADB device serial, not options or shell text")
    return value


def validate_ssh_host(value: str | None) -> str | None:
    if value is not None and not SSH_HOST_RE.fullmatch(value):
        raise ValueError("--ssh-host must be an SSH alias or hostname, not options or shell text")
    return value


def validate_package(value: str) -> str:
    if not PACKAGE_RE.fullmatch(value):
        raise ValueError("--package must be an Android package name")
    return value


def validate_activity(value: str) -> str:
    # The activity is intentionally kept as a component class only.  The
    # package is supplied separately so an accidental second component cannot
    # redirect the test to another package.
    if not value or "/" in value or any(ord(char) < 32 for char in value):
        raise ValueError("--activity must be a class name such as .MainActivity")
    if not re.fullmatch(r"\.?[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*", value):
        raise ValueError("--activity must be a class name such as .MainActivity")
    return value


class Adb:
    """Invoke ADB through a fixed argv prefix without a local shell."""

    def __init__(self, prefix: Iterable[str], serial: str, output_dir: Path,
                 ssh_host: str | None = None):
        self.prefix = validate_argv_prefix(prefix)
        self.serial = validate_serial(serial)
        self.ssh_host = validate_ssh_host(ssh_host)
        self.output_dir = output_dir
        self.calls: list[dict[str, Any]] = []
        self.call_number = 0

    def argv(self, args: Iterable[str], *, guest: bool = False) -> list[str]:
        args = list(args)
        command = [*self.prefix, "-s", self.serial]
        if guest:
            # First protect argv at the guest shell boundary. If SSH is used,
            # quote this whole command again at its separate remote boundary.
            command += ["shell", shlex.join(args)]
        else:
            command += args
        if self.ssh_host is not None:
            return ["ssh", *SSH_OPTIONS, self.ssh_host, shlex.join(command)]
        return command

    def run(self, label: str, args: Iterable[str], *, guest: bool = False) -> dict[str, Any]:
        command = self.argv(args, guest=guest)
        started_at = utc_now()
        monotonic = time.monotonic()
        try:
            result = subprocess.run(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=COMMAND_TIMEOUT_SECONDS,
                check=False,
                shell=False,
            )
            record: dict[str, Any] = {
                "label": label,
                "command": command,
                "started_at": started_at,
                "finished_at": utc_now(),
                "elapsed_seconds": round(time.monotonic() - monotonic, 3),
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "timed_out": False,
            }
        except subprocess.TimeoutExpired as exc:
            stdout = exc.stdout or ""
            stderr = exc.stderr or ""
            if isinstance(stdout, bytes):
                stdout = stdout.decode("utf-8", errors="replace")
            if isinstance(stderr, bytes):
                stderr = stderr.decode("utf-8", errors="replace")
            record = {
                "label": label,
                "command": command,
                "started_at": started_at,
                "finished_at": utc_now(),
                "elapsed_seconds": round(time.monotonic() - monotonic, 3),
                "returncode": None,
                "stdout": stdout,
                "stderr": stderr,
                "timed_out": True,
            }
        except OSError as exc:
            record = {
                "label": label,
                "command": command,
                "started_at": started_at,
                "finished_at": utc_now(),
                "elapsed_seconds": round(time.monotonic() - monotonic, 3),
                "returncode": None,
                "stdout": "",
                "stderr": str(exc),
                "timed_out": False,
                "os_error": type(exc).__name__,
            }
        self.call_number += 1
        index = f"{self.call_number:03d}"
        (self.output_dir / f"{index}-{label}.stdout.txt").write_text(
            record["stdout"], encoding="utf-8")
        (self.output_dir / f"{index}-{label}.stderr.txt").write_text(
            record["stderr"], encoding="utf-8")
        with (self.output_dir / "calls.jsonl").open("a", encoding="utf-8") as stream:
            stream.write(json.dumps({key: value for key, value in record.items()
                                     if key not in ("stdout", "stderr")}, ensure_ascii=False) + "\n")
        self.calls.append(record)
        return record


def successful(record: dict[str, Any]) -> bool:
    return not record["timed_out"] and record["returncode"] == 0


def output(record: dict[str, Any]) -> str:
    return record["stdout"].strip()


def first_pid(record: dict[str, Any]) -> int | None:
    """Accept exactly one positive PID, never a number inside diagnostic text."""
    if not successful(record):
        return None
    value = output(record)
    return int(value) if PID_RE.fullmatch(value) else None


def activity_started(record: dict[str, Any]) -> bool:
    # am can report an activity error with exit status zero. The explicit
    # status produced by -W is required; exit status alone is insufficient.
    if not successful(record):
        return False
    statuses = re.findall(r"^\s*Status:\s*(.*?)\s*$", record["stdout"], re.MULTILINE)
    if statuses != ["ok"]:
        return False
    combined = record["stdout"] + "\n" + record["stderr"]
    return re.search(r"^\s*(?:Error\b|Exception\b|(?:[\w$.]+\.)?[\w$]*Exception:)",
                     combined, re.MULTILINE) is None


def is_frozen(record: dict[str, Any]) -> bool | None:
    if not successful(record):
        return None
    value = output(record).lower()
    if value == "true":
        return True
    if value == "false":
        return False
    return None


class Probe:
    def __init__(self, adb: Adb, package: str, activity: str, wait_seconds: int):
        self.adb = adb
        self.package = package
        self.activity = activity
        self.component = f"{package}/{activity}"
        self.wait_seconds = wait_seconds
        self.report: dict[str, Any] = {
            "schema_version": 1,
            "status": "RUNNING",
            "started_at": utc_now(),
            "target": {
                "package": package,
                "activity": activity,
                "component": self.component,
                "serial": adb.serial,
                "adb_prefix": adb.prefix,
                "ssh_host": adb.ssh_host,
            },
            "configuration": {
                "wait_seconds": wait_seconds,
                "poll_seconds": POLL_SECONDS,
                "command_timeout_seconds": COMMAND_TIMEOUT_SECONDS,
                "force_freeze_used": False,
                "global_config_changed": False,
            },
            "calls": [],
            "limitations": [
                "This observes ordinary app natural cached-app freezing only.",
                "It does not validate AgentOS, AgentManagerService, Plugin sessions, or Binder lease exemptions.",
                "HOME is sent as a global key event; no display-focus assertion is made beyond am start -W.",
                "A stock build's freezer policy is not proof of the target custom AOSP policy.",
                "The previous foreground app is not restored; after PASS the requested activity remains foreground.",
            ],
        }

    def write_report(self) -> None:
        self.report["calls"] = [
            {key: value for key, value in call.items() if key not in ("stdout", "stderr")}
            for call in self.adb.calls
        ]
        temporary = self.adb.output_dir / "report.json.tmp"
        temporary.write_text(json.dumps(self.report, indent=2, ensure_ascii=False) + "\n",
                             encoding="utf-8")
        temporary.replace(self.adb.output_dir / "report.json")

    def call(self, label: str, args: Iterable[str], *, guest: bool = True) -> dict[str, Any]:
        record = self.adb.run(label, args, guest=guest)
        self.write_report()
        return record

    def inconclusive(self, reason: str) -> str:
        self.report["status"] = "INCONCLUSIVE"
        self.report["reason"] = reason
        return "INCONCLUSIVE"

    def run(self) -> str:
        # Environment evidence is captured before launching the app and is
        # persisted after each individual command, including a timeout.
        environment = {
            "fingerprint": self.call("fingerprint", ["getprop", "ro.build.fingerprint"]),
            "api": self.call("api", ["getprop", "ro.build.version.sdk"]),
            "selinux": self.call("selinux", ["getenforce"]),
            "original_activity_processes": self.call(
                "original-activity-processes", ["dumpsys", "activity", "processes"]),
        }
        self.report["environment"] = {
            key: {"stdout": value["stdout"], "stderr": value["stderr"],
                  "returncode": value["returncode"], "timed_out": value["timed_out"]}
            for key, value in environment.items()
        }
        self.write_report()
        if any(not successful(value) for value in environment.values()):
            return self.inconclusive("environment command failed or timed out")

        launch = self.call("launch", ["am", "start", "-W", "-n", self.component])
        if not activity_started(launch):
            return self.inconclusive("activity launch did not report Status: ok, failed, or timed out")
        initial_pid_record = self.call("initial-pid", ["pidof", self.package])
        initial_pid = first_pid(initial_pid_record)
        if initial_pid is None:
            self.report["initial"] = {"pid": None, "isfrozen": None}
            self.write_report()
            return self.inconclusive("could not identify the launched process or its initial frozen state")
        initial_frozen_record = self.call("initial-isfrozen", ["cmd", "activity", "isfrozen",
                                                                  str(initial_pid)])
        initial_frozen = is_frozen(initial_frozen_record)
        self.report["initial"] = {"pid": initial_pid, "isfrozen": initial_frozen}
        self.write_report()
        if initial_frozen is None:
            return self.inconclusive("could not identify the launched process or its initial frozen state")
        if initial_frozen:
            return self.inconclusive("launched process was already frozen; foreground precondition was not established")

        home = self.call("home", ["input", "keyevent", "KEYCODE_HOME"])
        if not successful(home):
            return self.inconclusive("HOME key event failed or timed out")

        self.report["observation"] = {"pid": initial_pid, "polls": [], "frozen_at": None}
        deadline = time.monotonic() + self.wait_seconds
        while time.monotonic() < deadline:
            pid_record = self.call("poll-pid", ["pidof", self.package])
            pid = first_pid(pid_record)
            frozen_record = self.call("poll-isfrozen", ["cmd", "activity", "isfrozen",
                                                          str(initial_pid)])
            frozen = is_frozen(frozen_record)
            poll = {
                "at": utc_now(),
                "pid": pid,
                "isfrozen": frozen,
                "elapsed_seconds": round(self.wait_seconds - max(0, deadline - time.monotonic()), 3),
            }
            self.report["observation"]["polls"].append(poll)
            self.write_report()
            if not successful(pid_record) or not successful(frozen_record) or frozen is None:
                return self.inconclusive("freezer poll command failed or returned an unknown state")
            if pid != initial_pid:
                self.report["status"] = "FAIL"
                self.report["reason"] = "the original app PID changed before it was observed frozen"
                return "FAIL"
            if frozen:
                self.report["observation"]["frozen_at"] = poll["at"]
                self.write_report()
                break
            time.sleep(min(POLL_SECONDS, max(0, deadline - time.monotonic())))
        else:
            pass

        if self.report["observation"]["frozen_at"] is None:
            self.report["status"] = "NOT_OBSERVED"
            self.report["reason"] = f"same PID did not become naturally frozen within {self.wait_seconds}s"
            return "NOT_OBSERVED"

        resume_started = time.monotonic()
        resume = self.call("resume", ["am", "start", "-W", "-n", self.component])
        resume_elapsed = round(time.monotonic() - resume_started, 3)
        resume_pid_record = self.call("resume-pid", ["pidof", self.package])
        resume_pid = first_pid(resume_pid_record)
        resume_frozen_record = self.call("resume-isfrozen", ["cmd", "activity", "isfrozen",
                                                                str(initial_pid)])
        resume_frozen = is_frozen(resume_frozen_record)
        self.report["resume"] = {
            "elapsed_seconds": resume_elapsed,
            "pid": resume_pid,
            "isfrozen": resume_frozen,
        }
        self.write_report()
        if not activity_started(resume) or not successful(resume_pid_record) or not successful(resume_frozen_record):
            self.report["status"] = "FAIL"
            self.report["reason"] = "resume command or post-resume observation failed"
            return "FAIL"
        if resume_pid != initial_pid or resume_frozen is not False:
            self.report["status"] = "FAIL"
            self.report["reason"] = "the frozen PID did not resume as the same unfrozen process"
            return "FAIL"
        self.report["status"] = "PASS"
        self.report["reason"] = "same app PID was naturally frozen and resumed unfrozen"
        return "PASS"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--adb-prefix", default='["adb"]',
                        help='JSON argv prefix used locally or on --ssh-host (default: ["adb"])')
    parser.add_argument("--ssh-host", help="optional SSH host; remote argv is safely shell-quoted")
    parser.add_argument("--serial", required=True, help="explicit ADB serial")
    parser.add_argument("--package", required=True)
    parser.add_argument("--activity", required=True)
    parser.add_argument("--output-dir", required=True, type=Path,
                        help="new directory for incremental evidence and report.json")
    parser.add_argument("--wait-seconds", type=int, default=40,
                        help="natural-freezer observation window, 1..120 seconds (default 40)")
    args = parser.parse_args(argv)
    try:
        prefix = parse_argv_prefix(args.adb_prefix)
        serial = validate_serial(args.serial)
        ssh_host = validate_ssh_host(args.ssh_host)
        package = validate_package(args.package)
        activity = validate_activity(args.activity)
        if not 1 <= args.wait_seconds <= 120:
            raise ValueError("--wait-seconds must be between 1 and 120")
        args.output_dir.mkdir(parents=True, exist_ok=False)
    except (OSError, ValueError) as exc:
        parser.exit(2, f"Invalid probe configuration: {exc}\n")

    adb = Adb(prefix, serial, args.output_dir, ssh_host=ssh_host)
    probe = Probe(adb, package, activity, args.wait_seconds)
    probe.write_report()
    try:
        status = probe.run()
    except KeyboardInterrupt:
        status = probe.inconclusive("interrupted while observing device")
    except Exception as exc:  # Keep partial evidence authoritative on unexpected errors.
        status = probe.inconclusive(f"probe error: {type(exc).__name__}: {exc}")
    finally:
        probe.report["finished_at"] = utc_now()
        probe.write_report()
    print(f"{status}: {args.output_dir / 'report.json'}")
    print(probe.report["reason"])
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
