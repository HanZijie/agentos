#!/usr/bin/env python3
"""Exercise the installed AgentOS discovery probe on a disposable Cuttlefish guest.

Requires a userdebug Cuttlefish, the real AgentOsPluginProbe APK installed for
user 0, and root via `su 0`. Only that probe is disabled, killed and rebound.
A temporary secondary user is created and removed. Freezer settings and the
original probe enablement are restored. No model, MCP tool or lease is tested.
Commands, observations and failures are saved locally even if the run fails.
"""
import argparse
import datetime
import json
from pathlib import Path
import re
import shlex
import subprocess
import time

PACKAGE = "com.example.agentos.probe"


class Session:
    def __init__(self, args):
        self.args = args
        self.directory = args.output_dir
        self.directory.mkdir(parents=True, exist_ok=False)
        self.report = {"scope": "discovery_probe_lifecycle", "status": "RUNNING",
                       "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                       "target": {"host": args.host, "serial": args.serial},
                       "steps": {}, "commands": [],
                       "limitations": ["No MCP/tool/resource calls or capability leases",
                                       "No physical Pixel 8 validation"]}
        self.save()

    def save(self):
        pending = self.directory / "report.json.tmp"
        pending.write_text(json.dumps(self.report, indent=2) + "\n")
        pending.replace(self.directory / "report.json")

    def shell(self, command, check=True):
        remote = ["timeout", "--kill-after=3s", "25s", self.args.adb,
                  "-s", self.args.serial, "shell", command]
        argv = ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
                "-o", "ConnectTimeout=10", self.args.host, shlex.join(remote)]
        started = time.monotonic()
        result = subprocess.run(argv, stdin=subprocess.DEVNULL, capture_output=True,
                                text=True, timeout=40)
        self.report["commands"].append({"guest_command": command,
              "returncode": result.returncode, "stdout": result.stdout,
              "stderr": result.stderr, "elapsed_seconds": round(time.monotonic()-started, 3)})
        self.save()
        if check and result.returncode:
            raise RuntimeError(f"Command failed: {command}: {result.stderr or result.stdout}")
        return result.stdout.strip()

    def step(self, name, evidence):
        self.report["steps"][name] = evidence
        self.save()
        print(name + ": " + json.dumps(evidence), flush=True)

    def plugin(self, user=0):
        rows = json.loads(self.shell(f"cmd agentos plugins --user {user}"))
        return next((r for r in rows if r["pluginId"] == PACKAGE), None)

    def await_plugin(self, user, predicate, seconds=15):
        deadline = time.monotonic() + seconds
        while True:
            row = self.plugin(user)
            if predicate(row):
                return row
            if time.monotonic() >= deadline:
                raise AssertionError(f"Plugin predicate timed out for user {user}: {row}")
            time.sleep(1)

    def process(self, uid):
        output = self.shell("ps -A -o UID,PID,NAME")
        matches = [int(cols[1]) for line in output.splitlines()
                   if len(cols := line.split()) == 3 and cols[0] == str(uid)
                   and cols[2] == PACKAGE]
        if len(matches) > 1:
            raise AssertionError("Probe has multiple processes")
        return matches[0] if matches else None

    def freezer(self, uid, pid):
        base = f"/sys/fs/cgroup/uid_{uid}/pid_{pid}"
        # cgroup.events confirms the completed freeze, not just the request bit.
        output = self.shell(f"su 0 cat {base}/cgroup.freeze {base}/cgroup.events", check=False)
        return {"pid": pid, "raw": output, "frozen": bool(re.search(r"(?m)^frozen 1$", output))}

    def run(self):
        temporary_user = None
        original_freezer = None
        original_enabled = None
        try:
            assert self.shell("getprop ro.product.device") == "vsoc_x86_64_only"
            assert self.shell("getprop ro.debuggable") == "1"
            assert self.shell("getenforce") == "Enforcing"
            assert self.shell("su 0 id -u") == "0"
            health = json.loads(self.shell("cmd agentos health"))
            assert health["state"] == "ready"
            self.step("preflight", {"status": "PASS", "health": health,
                                   "fingerprint": self.shell("getprop ro.build.fingerprint")})
            original_freezer = self.shell("settings get global cached_apps_freezer")
            initial = self.plugin()
            assert initial, "Install the real AgentOsPluginProbe APK before running"
            original_enabled = initial["enabled"]
            uid = initial["uid"]

            self.shell("settings put global cached_apps_freezer enabled")
            self.shell(f"cmd agentos enable --user 0 {PACKAGE}")
            active = self.await_plugin(0, lambda r: r and r["state"] == "active")
            pid = self.process(uid)
            assert pid
            old_session = active["sessionId"]
            time.sleep(12)
            sample = self.freezer(uid, pid)
            assert self.process(uid) == pid and not sample["frozen"]
            assert self.plugin()["state"] == "active"
            self.step("active_binding_freezer_enabled", {"status": "PASS", "sample": sample,
                       "settings": self.shell("dumpsys activity settings"),
                       "processes": self.shell(f"dumpsys activity processes {PACKAGE}")})

            self.shell(f"cmd agentos disable --user 0 {PACKAGE}")
            disabled = self.await_plugin(0, lambda r: r and not r["enabled"]
                                         and r["state"] == "idle" and not r["sessionId"])
            self.step("disable_revokes_session", {"status": "PASS", "record": disabled})
            samples = []
            until = time.monotonic() + 40
            while time.monotonic() < until:
                current = self.process(uid)
                if current != pid:
                    break
                samples.append(self.freezer(uid, pid))
                if samples[-1]["frozen"]:
                    break
                time.sleep(2)
            frozen = bool(samples and samples[-1]["frozen"])
            self.step("idle_natural_freeze", {"status": "OBSERVED" if frozen else "NOT_OBSERVED",
                                              "samples": samples})
            started = time.monotonic()
            self.shell(f"cmd agentos enable --user 0 {PACKAGE}")
            rebound = self.await_plugin(0, lambda r: r and r["state"] == "active"
                                       and r["sessionId"] != old_session)
            rebound_pid = self.process(uid)
            assert rebound_pid
            assert not self.freezer(uid, rebound_pid)["frozen"]
            self.step("rebind_after_idle", {"status": "PASS", "was_frozen": frozen,
                      "same_pid": rebound_pid == pid, "record": rebound,
                      "elapsed_seconds": round(time.monotonic()-started, 3)})

            self.shell(f"su 0 kill -9 {rebound_pid}")
            recovered = self.await_plugin(0, lambda r: r and r["state"] == "active"
                        and r["sessionId"] != rebound["sessionId"], seconds=30)
            new_pid = self.process(uid)
            assert new_pid and new_pid != rebound_pid
            self.step("binder_death_rebind", {"status": "PASS", "killed_pid": rebound_pid,
                      "new_pid": new_pid, "record": recovered})

            self.shell("settings put global cached_apps_freezer disabled")
            self.shell(f"cmd agentos disable --user 0 {PACKAGE}")
            self.await_plugin(0, lambda r: r and r["state"] == "idle")
            time.sleep(12)
            off_pid = self.process(uid)
            assert off_pid and not self.freezer(uid, off_pid)["frozen"]
            settings = self.shell("dumpsys activity settings")
            assert "use_freezer=false" in settings
            self.step("freezer_disabled_idle", {"status": "PASS", "pid": off_pid,
                                                "settings": settings})
            self.shell(f"cmd agentos enable --user 0 {PACKAGE}")
            self.await_plugin(0, lambda r: r and r["state"] == "active")

            label = "AgentOS-Probe-" + str(int(time.time()))
            created = self.shell("pm create-user " + label)
            match = re.search(r"Success: created user id (\d+)", created)
            assert match, created
            temporary_user = int(match[1])
            assert temporary_user != 0
            self.shell(f"am start-user -w {temporary_user}")
            self.shell(f"pm install-existing --user {temporary_user} {PACKAGE}")
            found = self.await_plugin(temporary_user, lambda r: r is not None)
            assert not found["enabled"]
            self.shell(f"cmd agentos enable --user {temporary_user} {PACKAGE}")
            user_active = self.await_plugin(temporary_user, lambda r: r and r["state"] == "active")
            assert user_active["uid"] != uid and user_active["userId"] == temporary_user
            assert self.plugin()["state"] == "active"
            self.step("secondary_user_isolated", {"status": "PASS", "record": user_active})
            removed = self.shell(f"pm remove-user --wait {temporary_user}")
            assert "Success" in removed, removed
            self.await_plugin(temporary_user, lambda r: r is None)
            grants = json.loads(self.shell("su 0 cat /data/system/agentos/plugins.json"))["grants"]
            assert not any(k.startswith(str(temporary_user)+"/") for k in grants)
            assert self.process(user_active["uid"]) is None
            self.step("user_removal_revokes", {"status": "PASS", "user": temporary_user,
                                             "grants": grants})
            temporary_user = None
            self.report["status"] = "PASS"
        except Exception as exc:
            self.report["status"] = "FAIL"
            self.report["error"] = str(exc)
            raise
        finally:
            cleanup = []
            if temporary_user is not None:
                cleanup.append(f"pm remove-user --wait {temporary_user}")
            if original_freezer is not None:
                cleanup.append("settings delete global cached_apps_freezer" if original_freezer == "null"
                               else "settings put global cached_apps_freezer " + shlex.quote(original_freezer))
            if original_enabled is not None:
                action = "enable" if original_enabled else "disable"
                cleanup.append(f"cmd agentos {action} --user 0 {PACKAGE}")
            self.report["cleanup_errors"] = []
            for command in cleanup:
                try:
                    self.shell(command)
                except Exception as exc:
                    self.report["cleanup_errors"].append(str(exc))
            if self.report["cleanup_errors"]:
                self.report["status"] = "FAIL"
            self.report["finished_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.save()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", required=True)
    parser.add_argument("--serial", required=True)
    parser.add_argument("--adb", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", args.host):
        parser.error("host must be an SSH alias")
    session = Session(args)
    try:
        session.run()
    except Exception as exc:
        print("FAIL: " + str(exc), flush=True)
    print(session.report["status"] + ": " + str(session.directory / "report.json"), flush=True)
    return 0 if session.report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
