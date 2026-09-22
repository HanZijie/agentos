#!/usr/bin/env python3
"""Boundary tests for check-cuttlefish.py; no device or SSH is used."""

import json
from pathlib import Path
import tempfile
import unittest

import importlib.util


SCRIPT = Path(__file__).with_name("check-cuttlefish.py")
SPEC = importlib.util.spec_from_file_location("check_cuttlefish", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def result(stdout, returncode=0):
    return {"command": ["fake"], "returncode": returncode, "stdout": stdout,
            "stderr": "", "timed_out": False, "elapsed_seconds": 0.001}


class FakeRemote:
    def __init__(self, values):
        self.values = values
        self.host = "fake"
        self.container = None
        self.adb = "adb"
        self.serial = "emulator-5554"

    def run(self, name):
        return self.values[name]


def boot_values(agentos=False, boot="1"):
    values = {
        "adb_state": result("device\n"),
        "boot_completed": result(boot + "\n"),
        "system_server": result("123\n"),
        "selinux": result("Enforcing\n"),
        "fingerprint": result("aosp_cf_x86_64_only_phone/ci/aosp_cf_x86_64_only_phone:15/BP1A/test:userdebug/test-keys\n"),
        "agentos_service": result("Service agentos: found\n" if agentos else "Service agentos: not found\n"),
        "sideagentd_service": result("Service agentos.sideagentd: found\n" if agentos else "Service agentos.sideagentd: not found\n"),
    }
    if agentos:
        values["agentos_health"] = result('{"state":"ready","protocolVersion":1,"startedAtMs":12345}\n')
    return values


class CheckCuttlefishTest(unittest.TestCase):
    def test_stock_allows_absent_agentos_but_passes_boot(self):
        with tempfile.TemporaryDirectory() as directory:
            report_dir = Path(directory) / "report"
            report = MODULE.verify(FakeRemote(boot_values()), "stock", report_dir)
            self.assertEqual(report["status"], "PASS")
            self.assertEqual(report["checks"]["agentos_service"]["status"], "ABSENT_ALLOWED")
            self.assertEqual(report["checks"]["agentos_health"]["status"], "NOT_RUN")
            self.assertEqual(json.loads((report_dir / "report.json").read_text())["status"], "PASS")

    def test_agentos_requires_health_and_both_services(self):
        with tempfile.TemporaryDirectory() as directory:
            report = MODULE.verify(FakeRemote(boot_values(agentos=True)), "agentos", Path(directory) / "report")
            self.assertEqual(report["status"], "PASS")
            self.assertEqual(report["checks"]["agentos_health"]["status"], "PASS")
        with tempfile.TemporaryDirectory() as directory:
            values = boot_values(agentos=True)
            values["sideagentd_service"] = result("Service agentos.sideagentd: not found\n")
            report = MODULE.verify(FakeRemote(values), "agentos", Path(directory) / "report")
            self.assertEqual(report["status"], "FAIL")

    def test_unbooted_device_fails_and_does_not_claim_health(self):
        with tempfile.TemporaryDirectory() as directory:
            report = MODULE.verify(FakeRemote(boot_values(boot="0")), "stock", Path(directory) / "report")
            self.assertEqual(report["status"], "FAIL")
            self.assertEqual(report["checks"]["boot_completed"]["status"], "FAIL")
            self.assertEqual(report["checks"]["agentos_health"]["status"], "NOT_RUN")

    def test_command_uses_fixed_argv_and_timeout(self):
        remote = MODULE.RemoteAdb("agentos-aosp", "127.0.0.1:6520", "/cf/bin/adb",
                                  "agentos-cf", True, 17)
        command = remote.command("boot_completed")
        self.assertEqual(command[:2], ["ssh", "-o"])
        joined = " ".join(command)
        self.assertIn("timeout --signal=TERM --kill-after=3s 17s", joined)
        self.assertIn("docker exec agentos-cf /cf/bin/adb -s 127.0.0.1:6520 shell 'getprop sys.boot_completed'", joined)
        with self.assertRaises(ValueError):
            MODULE.RemoteAdb("agentos-aosp; rm -rf /", "emulator-5554")


if __name__ == "__main__":
    unittest.main()
