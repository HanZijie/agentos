#!/usr/bin/env python3
"""Exercise AOSP wiring against isolated, tagged Git project fixtures.

These tests check wiring behavior and failure safety, not AOSP compilation.
Run with: python3 tools/aosp/test_wire_platform.py
"""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("wire-platform.py")
OVERLAY = SCRIPT.parents[2] / "platform/aosp-integration/overlay"
TAG = "android-15.0.0_r34"
PROJECTS = ("system/core", "frameworks/base", "system/sepolicy",
            "device/google/cuttlefish")
FIXTURE_FILES = {
    "system/core/libcutils/include/private/android_filesystem_config.h":
        "#define AID_SYSTEM 1000\n"
        "#define AID_MMD 1095                 /* uid for memory management daemon */\n"
        "// Additions to this file must be made in AOSP, *not* in internal branches.\n"
        "// You will also need to update expect_ids() in bionic/tests/grp_pwd_test.cpp.\n"
        "// Additions to this file must be made in AOSP, *not* in internal branches.\n"
        "// You will also need to update expect_ids() in bionic/tests/grp_pwd_test.cpp.\n",
    "frameworks/base/services/core/Android.bp":
        'java_library_static {\n    name: "services.core.unboosted",\n'
        '    static_libs: [\n        "existing-library",\n    ],\n}\n',
    "frameworks/base/services/java/com/android/server/SystemServer.java":
        "import com.android.server.am.ActivityManagerService;\n"
        "class SystemServer {\n    void startOtherServices() {\n"
        "        mSystemServiceManager.updateOtherServicesStartIndex();\n    }\n}\n",
    "frameworks/base/core/res/AndroidManifest.xml":
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n'
        "</manifest>\n",
    "system/sepolicy/private/file_contexts":
        "/system/bin/existing u:object_r:existing_exec:s0\n",
    "system/sepolicy/private/service_contexts":
        "existing u:object_r:existing_service:s0\n",
    "device/google/cuttlefish/shared/device.mk": "PRODUCT_PACKAGES += existing\n",
}


class WirePlatformTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="agentos-wiring-test-")
        self.addCleanup(self.temp.cleanup)
        self.parent = Path(self.temp.name)
        self.root = self.parent / "aosp"
        self.env = dict(os.environ, GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)
        self.write(".repo/manifests/default.xml",
                   f'<manifest><default revision="refs/tags/{TAG}" /></manifest>\n')
        for name, content in FIXTURE_FILES.items():
            self.write(name, content)
        for project in PROJECTS:
            self.git(project, "init", "--quiet")
            self.git(project, "add", ".")
            self.git(project, "commit", "--quiet", "-m", "Pinned AOSP fixture")
            self.git(project, "tag", TAG)

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def git(self, project, *args):
        return subprocess.run(
            ["git", "-c", "user.name=AgentOS Wiring Test", "-c",
             "user.email=wiring-test@example.invalid", "-c", "commit.gpgsign=false",
             "-c", "core.hooksPath=" + os.devnull, "-C", str(self.root / project), *args],
            env=self.env, text=True, capture_output=True, check=True)

    def wire(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), str(self.root), *args],
                              env=self.env, text=True, capture_output=True)

    def assert_success(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def snapshot(self, base=None):
        """Include mtimes to detect unnecessary rewrites, excluding Git internals."""
        base = base or self.parent
        return {str(path.relative_to(base)): (path.read_bytes(), path.stat().st_mtime_ns)
                for path in base.rglob("*")
                if path.is_file() and ".git" not in path.relative_to(base).parts}

    def test_cuttlefish_applies_without_pixel_checkout(self):
        self.assertFalse((self.root / "device/google/shusky").exists())
        self.assert_success(self.wire("--apply"))
        self.assertFalse((self.root / "device/google/shusky").exists())
        # The actual source overlay, including stable AIDL's hidden checksum,
        # must be present; a successful exit alone would miss a no-op script.
        for name in ("system/agent/Android.bp",
                     "system/agent/aidl_api/agentos_system_aidl/1/.hash",
                     "frameworks/base/services/core/java/com/android/server/agent/"
                     "AgentManagerService.java"):
            with self.subTest(file=name):
                self.assertEqual((self.root / name).read_bytes(), (OVERLAY / name).read_bytes())
        product = (self.root / "device/google/cuttlefish/shared/device.mk").read_text()
        self.assertIn("PRODUCT_PACKAGES += existing", product)
        self.assertIn("PRODUCT_PACKAGES += sideagentd", product)
        self.assertFalse((self.root / "device/google/cuttlefish/shared/overlay").exists())
        self.assertIn("PRODUCT_SOONG_NAMESPACES += system/agent", product)
        self.assertIn("PRODUCT_ARTIFACT_PATH_REQUIREMENT_ALLOWED_LIST += system/bin/sideagentd",
                      product)
        service_bp = (self.root / "frameworks/base/services/core/Android.bp").read_text()
        self.assertIn('"//system/agent:agentos_system_aidl-V3-java"', service_bp)
        self.assertIn('"existing-library"', service_bp)
        server = (self.root / "frameworks/base/services/java/com/android/server/"
                  "SystemServer.java").read_text()
        self.assertEqual(server.count("startService(AgentManagerService.class)"), 1)
        manifest = (self.root / "frameworks/base/core/res/AndroidManifest.xml").read_text()
        self.assertIn('android:protectionLevel="signature|privileged"', manifest)
        self.assertIn("#define AID_SIDEAGENT 1096", (self.root /
                      "system/core/libcutils/include/private/android_filesystem_config.h").read_text())
        aid = (self.root / "system/core/libcutils/include/private/android_filesystem_config.h").read_text()
        self.assertEqual(aid.index("#define AID_SIDEAGENT 1096"),
                         aid.index("#define AID_MMD 1095") +
                         len("#define AID_MMD 1095                 /* uid for memory management daemon */\n"))
        for name in ("sideagentd.te", "file_contexts", "service_contexts"):
            expected = (OVERLAY / "system/agent/sepolicy" / name).read_text()
            actual = (self.root / "system/sepolicy/private" / name).read_text()
            for line in expected.splitlines():
                if line.strip() and not line.startswith("#"):
                    self.assertIn(line, actual)

    def test_second_apply_is_idempotent_without_new_backup_or_rewrites(self):
        self.assert_success(self.wire("--apply"))
        before = self.snapshot()
        backup_dirs = sorted((self.parent / "agentos-wiring-backups").iterdir())
        result = self.wire("--apply")
        self.assert_success(result)
        self.assertIn("Applied 0 files and 0 APKs;", result.stdout)
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(sorted((self.parent / "agentos-wiring-backups").iterdir()), backup_dirs)

    def test_wrong_manifest_revision_rejects_before_any_mutation(self):
        self.write(".repo/manifests/default.xml",
                   '<manifest><default revision="refs/tags/android-15.0.0_r33" /></manifest>\n')
        before = self.snapshot()
        result = self.wire("--apply")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("pinned to android-15.0.0_r34", result.stderr)
        self.assertEqual(self.snapshot(), before)
        self.assertFalse((self.parent / "agentos-wiring-backups").exists())

    def test_non_r34_aid_declaration_rejects_before_any_mutation(self):
        aid_path = self.root / "system/core/libcutils/include/private/android_filesystem_config.h"
        aid_path.write_text(aid_path.read_text().replace("/* uid for memory management daemon */", "/* changed */"))
        before = self.snapshot()
        result = self.wire("--apply")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Expected exactly one android-15.0.0_r34 AID_MMD declaration", result.stderr)
        self.assertEqual(self.snapshot(), before)
        self.assertFalse((self.parent / "agentos-wiring-backups").exists())

    def test_actual_project_head_mismatch_rejects_despite_correct_manifest(self):
        # Check every participating repository: validating only the first one
        # would still let later projects drift away from the pinned build.
        for project in PROJECTS:
            with self.subTest(project=project):
                self.git(project, "commit", "--allow-empty", "--quiet", "-m", "Wrong revision")
                before = self.snapshot()
                result = self.wire("--apply")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(project + " HEAD does not match", result.stderr)
                self.assertEqual(self.snapshot(), before)
                self.assertFalse((self.parent / "agentos-wiring-backups").exists())
                self.git(project, "checkout", "--quiet", "--detach", "refs/tags/" + TAG)

    def test_backups_are_outside_source_tree_and_preserve_originals(self):
        self.assert_success(self.wire("--apply"))
        backup_dirs = list((self.parent / "agentos-wiring-backups").iterdir())
        self.assertEqual(len(backup_dirs), 1)
        backup = backup_dirs[0].resolve()
        self.assertNotIn(self.root.resolve(), backup.parents)
        self.assertFalse((self.root / ".agentos-wiring-backups").exists())
        self.assertFalse((self.root / "agentos-wiring-backups").exists())
        for name, original in FIXTURE_FILES.items():
            with self.subTest(file=name):
                self.assertEqual((backup / name).read_text(), original)
                self.assertNotEqual((self.root / name).read_text(), original)

    def test_dry_run_reports_changes_without_mutation(self):
        before = self.snapshot()
        result = self.wire()
        self.assert_success(result)
        self.assertIn("would change", result.stdout)
        self.assertIn("+PRODUCT_PACKAGES += sideagentd", result.stdout)
        self.assertEqual(self.snapshot(), before)

    def test_frontend_apks_are_staged_and_added_to_product(self):
        frontend = self.parent / "agenriod-debug.apk"
        notes = self.parent / "agenriod-notes-debug.apk"
        frontend.write_bytes(b"frontend-apk")
        notes.write_bytes(b"notes-apk")
        result = self.wire("--apply", "--frontend-apk", str(frontend),
                           "--notes-apk", str(notes))
        self.assert_success(result)
        self.assertEqual((self.root / "system/agent/frontend/prebuilt/agenriod.apk").read_bytes(),
                         b"frontend-apk")
        self.assertEqual((self.root / "system/agent/frontend/prebuilt/agenriod-notes.apk").read_bytes(),
                         b"notes-apk")
        self.assertTrue((self.root / "system/agent/frontend/Android.bp").is_file())
        product = (self.root / "device/google/cuttlefish/shared/device.mk").read_text()
        self.assertIn("PRODUCT_PACKAGES += agenriod_frontend agenriod_notes", product)
        self.assertIn("PRODUCT_PACKAGES += agenriod_frontend_privapp_permissions", product)
        self.assertIn("PRODUCT_PACKAGES += agenriod_frontend_default_permissions", product)
        config = (self.root / "device/google/cuttlefish/shared/overlay/frameworks/base/core/res/res/values/agentos_config.xml").read_text()
        self.assertIn("config_defaultAssistant", config)
        before = self.snapshot()
        repeat = self.wire("--apply", "--frontend-apk", str(frontend),
                           "--notes-apk", str(notes))
        self.assert_success(repeat)
        self.assertIn("Applied 0 files and 0 APKs;", repeat.stdout)
        self.assertEqual(self.snapshot(), before)

    def test_demo_apks_are_staged_and_added_to_product(self):
        alarm = self.parent / "alarm-debug.apk"
        calendar = self.parent / "calendar-debug.apk"
        records = self.parent / "meeting-records-debug.apk"
        alarm.write_bytes(b"alarm-apk")
        calendar.write_bytes(b"calendar-apk")
        records.write_bytes(b"records-apk")
        result = self.wire(
            "--apply",
            "--demo-alarm-apk", str(alarm),
            "--demo-calendar-apk", str(calendar),
            "--demo-meeting-records-apk", str(records),
        )
        self.assert_success(result)
        self.assertEqual((self.root / "system/agent/demo/prebuilt/alarm.apk").read_bytes(), b"alarm-apk")
        self.assertEqual((self.root / "system/agent/demo/prebuilt/calendar.apk").read_bytes(), b"calendar-apk")
        self.assertEqual((self.root / "system/agent/demo/prebuilt/meeting-records.apk").read_bytes(), b"records-apk")
        self.assertTrue((self.root / "system/agent/demo/Android.bp").is_file())
        product = (self.root / "device/google/cuttlefish/shared/device.mk").read_text()
        self.assertIn("PRODUCT_PACKAGES += agentos_demo_alarm agentos_demo_calendar agentos_demo_meeting_records", product)
        before = self.snapshot()
        repeat = self.wire(
            "--apply",
            "--demo-alarm-apk", str(alarm),
            "--demo-calendar-apk", str(calendar),
            "--demo-meeting-records-apk", str(records),
        )
        self.assert_success(repeat)
        self.assertIn("Applied 0 files and 0 APKs;", repeat.stdout)
        self.assertEqual(self.snapshot(), before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
