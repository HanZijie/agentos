#!/usr/bin/env python3
"""Offline tests for the official Cuttlefish fallback fetcher."""

import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tarfile
import tempfile
import unittest
import zipfile

MODULE_PATH = Path(__file__).parents[1] / "fetch-cuttlefish.py"
SPEC = importlib.util.spec_from_file_location("fetch_cuttlefish", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FetchCuttlefishTest(unittest.TestCase):
    def test_jsvariables_json_decodes_unicode_and_escaped_slashes(self):
        html = r'''<script>var JSVariables = {"artifactUrl":"https:\/\/storage.googleapis.com\/bucket\/x?name=\u4e2d\u6587", "brace":"}"};</script>'''
        self.assertEqual(
            MODULE.parse_artifact_url(html),
            "https://storage.googleapis.com/bucket/x?name=中文",
        )

    def test_viewer_html_requires_artifact_url(self):
        with self.assertRaises(MODULE.FetchError):
            MODULE.parse_artifact_url("<html><body>viewer</body></html>")
        with self.assertRaises(MODULE.FetchError):
            MODULE.parse_artifact_url('var JSVariables={"artifactUrl":"http://example.test/x"};')

    def test_complete_zip_and_html_rejection(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            archive = directory / "image.zip"
            with zipfile.ZipFile(archive, "w") as output:
                output.writestr("system.img", b"small fixture")
            MODULE.validate_artifact(archive, "zip")
            archive.write_text("<!doctype html><html>viewer</html>")
            with self.assertRaises(MODULE.FetchError):
                MODULE.validate_artifact(archive, "zip")

    def test_complete_tar_gz_and_manifest_xml(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            source = directory / "file.txt"
            source.write_text("fixture")
            package = directory / "host.tar.gz"
            with tarfile.open(package, "w:gz") as output:
                output.add(source, arcname="file.txt")
            MODULE.validate_artifact(package, "tar.gz")
            manifest = directory / "manifest.xml"
            manifest.write_text('<manifest><project name="platform/build" /></manifest>')
            MODULE.validate_artifact(manifest, "xml")
            manifest.write_text("<html>viewer</html>")
            with self.assertRaises(MODULE.FetchError):
                MODULE.validate_artifact(manifest, "xml")

    def test_fetch_uses_public_provenance_and_no_signed_url(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            signed = "https://storage.googleapis.com/private/object?token=secret"
            viewer = ('var JSVariables = ' + json.dumps({"artifactUrl": signed}) + ';')
            viewer_calls = []

            archive = directory / "artifact.zip"
            with zipfile.ZipFile(archive, "w") as output:
                output.writestr("system.img", b"fixture")

            class Fake:
                def __init__(self):
                    self.calls = 0

                def __call__(self, url, timeout):
                    viewer_calls.append(url)
                    return viewer

            fake = Fake()
            # Avoid aria2: copy the fixture as a completed transfer and assert
            # the signed URL is only passed to the private runner seam.
            original = MODULE.run_aria2
            try:
                def fake_aria2(binary, url, destination, timeout):
                    self.assertEqual(url, signed)
                    shutil.copy2(archive, destination)
                    return True
                MODULE.run_aria2 = fake_aria2
                result = MODULE.fetch_one(
                    "aosp_cf_x86_64_only_phone-img-16373615.zip", "zip",
                    MODULE.BUILD_ID, MODULE.TARGET, directory / "out", "aria2c", 1,
                    viewer_fetch=fake,
                )
            finally:
                MODULE.run_aria2 = original
            self.assertEqual(viewer_calls, [MODULE.viewer_url(MODULE.BUILD_ID, MODULE.TARGET,
                                                               "aosp_cf_x86_64_only_phone-img-16373615.zip")])
            self.assertNotIn("storage.googleapis.com/private", json.dumps(result))
            self.assertEqual(set(result), {"viewer_url", "build_id", "sha256", "bytes"})
            self.assertNotIn("secret", (directory / "out" / "aosp_cf_x86_64_only_phone-img-16373615.zip.provenance.json").read_text())

    def test_control_file_means_download_is_not_complete(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            destination = directory / "artifact.zip"
            destination.write_bytes(b"not an archive")
            control = Path(str(destination) + ".aria2")
            control.write_text("partial")
            self.assertTrue(control.exists())
            with self.assertRaises(MODULE.FetchError):
                MODULE.validate_artifact(destination, "zip")


if __name__ == "__main__":
    unittest.main()
