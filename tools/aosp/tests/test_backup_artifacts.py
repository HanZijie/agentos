#!/usr/bin/env python3
"""Small local tests for backup-artifacts.py; no SSH or large files involved."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest


MODULE_PATH = Path(__file__).parents[1] / "backup-artifacts.py"
SPEC = importlib.util.spec_from_file_location("backup_artifacts", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def stat_record(path):
    stat = path.stat()
    return {"size": stat.st_size, "mtime_ns": stat.st_mtime_ns,
            "ctime_ns": stat.st_ctime_ns, "inode": stat.st_ino,
            "device": stat.st_dev}


class FakeRemote:
    host = "local-fixture"

    def __init__(self, source):
        self.source = source
        self.changed_after_hash = False
        self.hash_calls = 0

    def inventory(self, roots):
        return {"now_ns": 10**30, "missing_roots": [], "files": [{
            "key": "artifacts/target/product/aosp_cf_x86_64_only_phone/system.img",
            "path": str(self.source), "kind": "artifact", "stat": stat_record(self.source),
        }]}

    def hash(self, path):
        self.hash_calls += 1
        digest = hashlib.sha256(self.source.read_bytes()).hexdigest()
        before = stat_record(self.source)
        if self.changed_after_hash and self.hash_calls == 2:
            self.source.write_bytes(self.source.read_bytes() + b"changed")
            return {"sha256": digest, "stat": stat_record(self.source), "stable": False}
        return {"sha256": digest, "stat": before, "stable": True}

    def copy(self, source, destination):
        shutil.copy2(self.source, destination)


class BackupArtifactsTest(unittest.TestCase):
    def test_atomic_copy_publishes_checksum_and_index(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            source = directory / "system.img"
            source.write_bytes(b"small local fixture")
            destination = directory / "backup"
            remote = FakeRemote(source)
            backup = MODULE.Backup(remote, destination,
                                   [["artifacts", "/tmp/aosp-out", False]], 0)
            self.assertEqual(backup.run_once(), 0)
            final = destination / "artifacts/target/product/aosp_cf_x86_64_only_phone/system.img"
            self.assertEqual(final.read_bytes(), source.read_bytes())
            self.assertTrue((destination / "index.json").is_file())
            checksum = destination / ".checksums/artifacts/target/product/aosp_cf_x86_64_only_phone/system.img.sha256"
            self.assertIn(hashlib.sha256(source.read_bytes()).hexdigest(), checksum.read_text())
            self.assertEqual(list((destination / ".partial").glob("**/*.source.json")), [])

    def test_source_change_is_pending_and_never_published(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            source = directory / "system.img"
            source.write_bytes(b"old")
            destination = directory / "backup"
            remote = FakeRemote(source)
            remote.changed_after_hash = True
            backup = MODULE.Backup(remote, destination,
                                   [["artifacts", "/tmp/aosp-out", False]], 0)
            self.assertEqual(backup.run_once(), 3)
            final = destination / "artifacts/target/product/aosp_cf_x86_64_only_phone/system.img"
            self.assertFalse(final.exists())
            index = json.loads((destination / "index.json").read_text())
            self.assertIn("pending", index["files"]["artifacts/target/product/aosp_cf_x86_64_only_phone/system.img"]["status"])


if __name__ == "__main__":
    unittest.main()
