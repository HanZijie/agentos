#!/usr/bin/env python3
"""Fetch the fixed official Cuttlefish fallback artifacts safely.

The Android CI artifact page is an HTML viewer.  It embeds a short-lived,
private storage URL in ``JSVariables.artifactUrl``; this script resolves that
URL in memory and never writes it to provenance or normal output.  aria2 is
restarted only after its previous process has exited, so a later attempt gets a
fresh signed URL.  An artifact is published only after the control file is
absent, its archive/XML structure is valid, and its SHA-256 is known.

This fallback is intentionally pinned to the build selected during the AOSP
rebuild.  It is a system-validation artifact, not a substitute for a local
AOSP build or a Pixel 8 factory image.
"""

from __future__ import annotations

import argparse
import datetime as _datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from typing import Callable, Iterable
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET
import zipfile
import gzip


BUILD_ID = "16373615"
TARGET = "aosp_cf_x86_64_only_phone-userdebug"
CI_ROOT = "https://ci.android.com/builds/submitted"
ARTIFACTS = (
    ("aosp_cf_x86_64_only_phone-img-16373615.zip", "zip"),
    ("cvd-host_package.tar.gz", "tar.gz"),
    ("manifest_16373615.xml", "xml"),
)


class FetchError(RuntimeError):
    """An expected fetch or validation failure without sensitive URL text."""


def viewer_url(build_id: str, target: str, filename: str) -> str:
    """Return the public CI viewer URL; the signed URL is never constructed here."""
    return f"{CI_ROOT}/{build_id}/{target}/latest/{filename}"


def _json_object_after_marker(html: str, marker: str = "JSVariables") -> dict:
    """Extract and decode the JSON object assigned to a JS variable.

    A brace scanner is used only to identify the JSON boundary.  The object is
    then decoded by ``json.loads``; this correctly handles escaped Unicode,
    escaped slashes, and braces inside quoted strings without evaluating JS.
    """
    match = re.search(r"\b" + re.escape(marker) + r"\s*=\s*", html)
    if not match:
        raise FetchError("artifact viewer did not contain JSVariables")
    start = html.find("{", match.end())
    if start < 0:
        raise FetchError("artifact viewer JSVariables object is missing")
    depth = 0
    quoted = False
    escaped = False
    end = None
    for index in range(start, len(html)):
        char = html[index]
        if quoted:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                quoted = False
            continue
        if char == '"':
            quoted = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
            if depth < 0:
                break
    if end is None:
        raise FetchError("artifact viewer JSVariables JSON is incomplete")
    try:
        value = json.loads(html[start:end])
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise FetchError("artifact viewer JSVariables is not JSON") from None
    if not isinstance(value, dict):
        raise FetchError("artifact viewer JSVariables is not an object")
    return value


def parse_artifact_url(html: str) -> str:
    """Extract an HTTPS artifact URL from a CI viewer HTML response."""
    variables = _json_object_after_marker(html)
    url = variables.get("artifactUrl")
    if not isinstance(url, str):
        raise FetchError("artifact viewer did not provide artifactUrl")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise FetchError("artifactUrl was not an HTTPS URL")
    return url


def _looks_like_html(path: Path) -> bool:
    try:
        sample = path.read_bytes()[:8192].lstrip().lower()
    except OSError as exc:
        raise FetchError("cannot read downloaded artifact") from None
    return (sample.startswith((b"<!doctype html", b"<html", b"<head", b"<script"))
            or b"jsvariables" in sample)


def validate_artifact(path: Path, kind: str) -> None:
    """Reject viewer HTML and validate the complete container/XML structure."""
    if not path.is_file() or path.stat().st_size == 0:
        raise FetchError("downloaded artifact is empty")
    if _looks_like_html(path):
        raise FetchError("downloaded artifact is viewer HTML")
    try:
        if kind == "zip":
            with zipfile.ZipFile(path) as archive:
                if not archive.infolist():
                    raise FetchError("zip artifact has no entries")
                broken = archive.testzip()
                if broken is not None:
                    raise FetchError("zip artifact contains a corrupt entry")
        elif kind == "tar.gz":
            with gzip.open(path, "rb") as compressed:
                with tarfile.open(fileobj=compressed, mode="r:") as archive:
                    if not archive.getmembers():
                        raise FetchError("host package has no tar entries")
        elif kind == "xml":
            root = ET.parse(path).getroot()
            if root.tag.rsplit("}", 1)[-1] != "manifest":
                raise FetchError("manifest XML has an unexpected root")
        else:
            raise FetchError("unknown artifact format")
    except FetchError:
        raise
    except (OSError, EOFError, ET.ParseError, tarfile.TarError, zipfile.BadZipFile,
            gzip.BadGzipFile) as exc:
        raise FetchError("downloaded artifact failed its format check") from None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w") as stream:
        json.dump(value, stream, indent=2, sort_keys=True)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


def _fetch_viewer_html(url: str, timeout: float) -> str:
    """Fetch public viewer HTML while keeping response errors out of logs."""
    try:
        request = Request(url, headers={"User-Agent": "AgentOS-Cuttlefish-Fallback/1"})
        with urlopen(request, timeout=timeout) as response:
            body = response.read(4 * 1024 * 1024 + 1)
    except Exception as exc:  # Do not expose a redirect/signed URL in an error string.
        raise FetchError("could not fetch artifact viewer") from None
    if len(body) > 4 * 1024 * 1024:
        raise FetchError("artifact viewer response was unexpectedly large")
    try:
        return body.decode("utf-8")
    except UnicodeDecodeError:
        raise FetchError("artifact viewer response was not UTF-8") from None


def _write_private_url(url: str) -> str:
    handle = tempfile.NamedTemporaryFile(prefix="agentos-artifact-url-", mode="w",
                                         encoding="utf-8", delete=False)
    try:
        os.chmod(handle.name, 0o600)
        handle.write(url + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    finally:
        handle.close()
    return handle.name


def run_aria2(aria2: str, signed_url: str, destination: Path, timeout: float) -> bool:
    """Run one aria2 attempt; process completion is awaited before returning."""
    url_file = _write_private_url(signed_url)
    try:
        command = [aria2, "--input-file=" + url_file,
                   "--dir=" + str(destination.parent), "--out=" + destination.name,
                   "--continue=true", "--allow-overwrite=true", "--auto-file-renaming=false",
                   "--file-allocation=none", "--max-tries=1", "--retry-wait=0",
                   "--connect-timeout=15", "--timeout=120", "--summary-interval=0",
                   "--console-log-level=warn"]
        try:
            completed = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       text=True, timeout=timeout, check=False)
        except (OSError, subprocess.SubprocessError):
            return False
        # Do not print/copy aria2 output: it may contain the short-lived URL.
        return completed.returncode == 0
    finally:
        try:
            os.unlink(url_file)
        except FileNotFoundError:
            pass


def _provenance(path: Path, public_url: str, build_id: str) -> dict:
    return {"viewer_url": public_url, "build_id": build_id,
            "sha256": sha256_file(path), "bytes": path.stat().st_size}


def fetch_one(filename: str, kind: str, build_id: str, target: str, output: Path,
              aria2: str, retries: int, viewer_fetch: Callable[[str, float], str] = _fetch_viewer_html,
              timeout: float = 30.0) -> dict:
    """Download and validate one artifact; return public provenance only."""
    public_url = viewer_url(build_id, target, filename)
    destination = output / filename
    control = Path(str(destination) + ".aria2")
    provenance_path = Path(str(destination) + ".provenance.json")
    output.mkdir(parents=True, exist_ok=True)
    if destination.is_file() and not control.exists() and provenance_path.is_file():
        try:
            prior = json.loads(provenance_path.read_text())
            if (prior.get("viewer_url") == public_url and prior.get("build_id") == build_id
                    and prior.get("bytes") == destination.stat().st_size
                    and prior.get("sha256") == sha256_file(destination)):
                validate_artifact(destination, kind)
                return prior
        except (OSError, ValueError, FetchError):
            pass
    last_error = "download did not complete"
    for _attempt in range(retries):
        try:
            # url is held only in memory/private temporary input; never returned/logged.
            signed_url = parse_artifact_url(viewer_fetch(public_url, timeout))
            if not run_aria2(aria2, signed_url, destination, timeout):
                last_error = "aria2 download failed"
                # A failed invocation without a control file is not a resumable
                # transfer. Do not let stale bytes be mistaken for this build.
                if destination.exists() and not control.exists():
                    try:
                        destination.unlink()
                    except OSError:
                        pass
                continue
            if control.exists():
                last_error = "aria2 control file remains"
                continue
            if not destination.is_file():
                last_error = "aria2 produced no file"
                continue
            validate_artifact(destination, kind)
            provenance = _provenance(destination, public_url, build_id)
            atomic_json(provenance_path, provenance)
            return provenance
        except FetchError as exc:
            last_error = str(exc)
            # A malformed/HTML response must not be treated as a resumable image.
            if destination.exists() and not control.exists():
                try:
                    destination.unlink()
                except OSError:
                    pass
        except (OSError, ValueError):
            last_error = "download or validation failed"
    raise FetchError(f"{filename}: {last_error}")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--build-id", default=BUILD_ID)
    parser.add_argument("--target", default=TARGET)
    parser.add_argument("--output", type=Path, default=Path("/mnt/aosp-out/fallback"))
    parser.add_argument("--aria2", default=shutil.which("aria2c") or "aria2c")
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--timeout", type=float, default=7200)
    args = parser.parse_args(argv)
    if args.build_id != BUILD_ID or args.target != TARGET:
        parser.error(f"fallback is pinned to build {BUILD_ID} and target {TARGET}")
    if args.retries < 1 or args.timeout <= 0:
        parser.error("retries must be positive and timeout must be positive")
    try:
        if shutil.which(args.aria2) is None and not Path(args.aria2).is_file():
            raise FetchError("aria2c is required; install it before downloading fallback artifacts")
        results = []
        for filename, kind in ARTIFACTS:
            result = fetch_one(filename, kind, BUILD_ID, TARGET, args.output,
                               args.aria2, args.retries, timeout=args.timeout)
            results.append(result)
            print("verified " + filename + " sha256=" + result["sha256"])
        return 0
    except FetchError as exc:
        print("fallback fetch failed: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
