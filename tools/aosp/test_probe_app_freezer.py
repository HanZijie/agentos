#!/usr/bin/env python3
"""False-pass and shell-boundary regressions; no ADB device is accessed."""

import importlib.util
import json
from pathlib import Path
import shlex
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location(
    "probe_app_freezer", Path(__file__).with_name("probe-app-freezer.py"))
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def response(stdout, stderr="", returncode=0, timed_out=False):
    return {"stdout": stdout, "stderr": stderr,
            "returncode": returncode, "timed_out": timed_out}


class ScriptedAdb(MODULE.Adb):
    """Supply command responses to exercise verdicts, not platform behaviour."""

    def __init__(self, output_dir, launch, resume=None):
        super().__init__(["adb"], "emulator-5554", output_dir)
        self.responses = {
            "fingerprint": response("test/device/build:17/test/test:userdebug/test-keys\n"),
            "api": response("37\n"), "selinux": response("Enforcing\n"),
            "original-activity-processes": response("process dump\n"),
            "launch": launch, "initial-pid": response("1234\n"),
            "initial-isfrozen": response("false\n"), "home": response(""),
            "poll-pid": response("1234\n"), "poll-isfrozen": response("true\n"),
            "resume": resume, "resume-pid": response("1234\n"),
            "resume-isfrozen": response("false\n"),
        }

    def run(self, label, args, *, guest=False):
        record = {"label": label, **self.responses[label]}
        self.calls.append(record)
        return record


class ProbeFreezerTest(unittest.TestCase):
    def test_ssh_quotes_both_shell_boundaries_for_inner_class(self):
        guest = ["am", "start", "-W", "-n", "com.example.app/.Main$Inner"]
        adb = MODULE.Adb(["sudo", "-n", "docker", "exec", "agentos-cf", "/cf/bin/adb"],
                         "127.0.0.1:6520", Path("unused"), ssh_host="agentos-aosp")
        command = adb.argv(guest, guest=True)
        self.assertEqual(command[:-1], ["ssh", *MODULE.SSH_OPTIONS, "agentos-aosp"])
        remote_argv = shlex.split(command[-1])
        self.assertEqual(remote_argv[:-1], [*adb.prefix, "-s", "127.0.0.1:6520", "shell"])
        self.assertEqual(shlex.split(remote_argv[-1]), guest)
        local = MODULE.Adb(["adb"], "emulator-5554", Path("unused"))
        self.assertEqual(shlex.split(local.argv(guest, guest=True)[-1]), guest)

    def test_flattening_prefix_and_serial_injection_are_rejected(self):
        for prefix in (["ssh", "agentos-aosp", "adb"],
                       ["/usr/bin/ssh", "agentos-aosp", "adb"],
                       ["sh", "-c", "adb"]):
            with self.subTest(prefix=prefix), self.assertRaises(ValueError):
                MODULE.parse_argv_prefix(json.dumps(prefix))
        for serial in ("-s other", "abc;touch /tmp/unsafe", "abc$(id)", "abc\nother"):
            with self.subTest(serial=serial), self.assertRaises(ValueError):
                MODULE.Adb(["adb"], serial, Path("unused"))
        with self.assertRaises(ValueError):
            MODULE.Adb(["adb"], "emulator-5554", Path("unused"), ssh_host="host;id")

    def test_pid_requires_exactly_one_positive_integer(self):
        self.assertEqual(MODULE.first_pid(response("1234\r\n")), 1234)
        for text in ("", "0", "-1", "1234 5678", "1234\n5678", "Error 1234", "pid=1234"):
            with self.subTest(text=text):
                self.assertIsNone(MODULE.first_pid(response(text)))
        self.assertIsNone(MODULE.first_pid(response("1234", returncode=1)))
        self.assertIsNone(MODULE.first_pid(response("1234", timed_out=True)))

    def test_activity_requires_status_ok_and_rejects_exit_zero_errors(self):
        self.assertTrue(MODULE.activity_started(response(
            "Starting: Intent { cmp=com.example.app/.Main }\nStatus: ok\nComplete\n")))
        self.assertTrue(MODULE.activity_started(response(
            "Warning: Activity not started, intent delivered to top-most instance.\nStatus: ok\n")))
        failures = [
            response("Error type 3\nError: Activity class does not exist.\n"),
            response("Starting: Intent { cmp=com.example.app/.Main }\n"),
            response("Status: timeout\n"),
            response("Status: ok\nError: Activity not started\n"),
            response("Status: ok\n", "java.lang.SecurityException: Permission Denial\n"),
            response("Status: ok\n", timed_out=True),
            response("Status: ok\n", returncode=1),
        ]
        for value in failures:
            with self.subTest(value=value):
                self.assertFalse(MODULE.activity_started(value))

    def test_failed_launch_stops_before_home_or_pid_observation(self):
        with tempfile.TemporaryDirectory() as directory:
            adb = ScriptedAdb(Path(directory), response("Error type 3\n"))
            probe = MODULE.Probe(adb, "com.example.app", ".Main", 1)
            self.assertEqual(probe.run(), "INCONCLUSIVE")
            self.assertEqual(adb.calls[-1]["label"], "launch")

    def test_failed_resume_cannot_pass_even_when_same_pid_is_unfrozen(self):
        with tempfile.TemporaryDirectory() as directory:
            adb = ScriptedAdb(Path(directory), response("Status: ok\n"),
                              response("Error: Activity not started\n"))
            probe = MODULE.Probe(adb, "com.example.app", ".Main", 1)
            self.assertEqual(probe.run(), "FAIL")
            self.assertEqual(probe.report["resume"]["pid"], 1234)
            self.assertFalse(probe.report["resume"]["isfrozen"])

    def test_success_requires_observed_frozen_cycle_and_successful_resume(self):
        with tempfile.TemporaryDirectory() as directory:
            adb = ScriptedAdb(Path(directory), response("Status: ok\n"), response("Status: ok\n"))
            probe = MODULE.Probe(adb, "com.example.app", ".Main", 1)
            self.assertEqual(probe.run(), "PASS")
            self.assertIsNotNone(probe.report["observation"]["frozen_at"])
            self.assertEqual(probe.report["initial"]["pid"], probe.report["resume"]["pid"])


if __name__ == "__main__":
    unittest.main()
