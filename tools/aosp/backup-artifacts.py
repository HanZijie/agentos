#!/usr/bin/env python3
"""Back up AOSP artifacts and curated evidence over an existing SSH alias.

Example (run on the computer that will keep the backups):
  python3 tools/aosp/backup-artifacts.py --watch \
    --remote-out /mnt/aosp-out/aosp-out \
    --evidence-root /mnt/aosp-out/evidence --evidence-root /mnt/aosp-out/logs \
    --local-dir ../.local/aosp-artifacts/2026-09-22-rebuild

Requires Python 3 on both hosts and rsync supporting --append-verify and
--protect-args. SSH uses BatchMode and StrictHostKeyChecking; provision the
host key and authentication first. This tool never copies SSH keys or env files.
Evidence roots must be curated directories containing logs, manifests, patches,
tool versions and checksums. Generating that evidence remains the build's job.

Only files with matching remote-before, remote-after and local SHA-256 become
published files. A mutable source is pending, and its partial copy is retained.
index.json records the verified snapshot, not a promise that the next build has
finished. Old verified copies remain available while a new version is pending.
Run --once after the build stops, and inspect index.json before retiring a host.
Exit codes for --once: 0 = all discovered files verified, 1 = error,
3 = pending files or no image/package found. --watch retries until interrupted.
"""

import argparse
import base64
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import subprocess
import sys
import time


# Run with python3 over stdin; payload is data, never interpolated Python/shell.
REMOTE_SCRIPT = r'''
import base64, hashlib, json, os, pathlib, stat, sys, time
p = json.loads(base64.urlsafe_b64decode(sys.argv[1]))
def signature(s):
    return {"size": s.st_size, "mtime_ns": s.st_mtime_ns,
            "ctime_ns": s.st_ctime_ns, "inode": s.st_ino, "device": s.st_dev}
def allowed(name, evidence=False):
    lower = name.lower()
    if evidence:
        return (not name.startswith(".") and (lower.endswith((".log", ".txt", ".json", ".xml", ".patch", ".diff", ".sha256", ".md", ".csv")) or name == "SHA256SUMS"))
    return (lower.endswith(".img") or name == "kernel" or
            (lower.endswith(".zip") and ("target_files" in lower or "aosp_cf" in lower)) or
            (lower.endswith((".tar.gz", ".tar.xz", ".tgz", ".zip")) and
             ("cvd-host" in lower or "cuttlefish" in lower)))
if p["action"] == "inventory":
    files, missing = [], []
    for label, root_name, evidence in p["roots"]:
        root = pathlib.Path(root_name)
        if not root.is_dir():
            missing.append(root_name)
            continue
        root = root.resolve()
        if evidence:
            candidates = []
            for directory, dirs, names in os.walk(root, followlinks=False):
                dirs[:] = [d for d in dirs if not d.startswith(".") and not (pathlib.Path(directory)/d).is_symlink()]
                candidates.extend(pathlib.Path(directory)/n for n in names if allowed(n, True))
        else:
            directories = [root, root/"dist", root/"host/linux-x86"]
            products = root/"target/product"
            if products.is_dir():
                for product in products.iterdir():
                    if product.is_dir() and not product.is_symlink():
                        directories.extend([product, product/"obj/PACKAGING/target_files_intermediates"])
            candidates = [f for d in directories if d.is_dir() for f in d.iterdir() if allowed(f.name)]
        for f in sorted(set(candidates)):
            try:
                s = f.lstat()
                if not stat.S_ISREG(s.st_mode) or f.resolve() != f:
                    continue
                relative = str(f.relative_to(root))
                files.append({"key": label+"/"+relative, "path": str(f),
                              "kind": "evidence" if evidence else "artifact",
                              "stat": signature(s)})
            except FileNotFoundError:
                continue
    print(json.dumps({"files": files, "missing_roots": missing, "now_ns": time.time_ns()}))
elif p["action"] == "hash":
    path = pathlib.Path(p["path"])
    if path.resolve() != path:
        raise RuntimeError("Refusing symlink in source path")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, "rb") as f:
        before = os.fstat(f.fileno())
        if not stat.S_ISREG(before.st_mode):
            raise RuntimeError("Source is not a regular file")
        digest = hashlib.sha256()
        for block in iter(lambda: f.read(8*1024*1024), b""):
            digest.update(block)
        after = os.fstat(f.fileno())
    current = path.lstat()
    print(json.dumps({"sha256": digest.hexdigest(), "stat": signature(after),
                      "stable": signature(before) == signature(after) == signature(current)}))
'''

SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
               "-o", "ConnectTimeout=15", "-o", "ServerAliveInterval=15",
               "-o", "ServerAliveCountMax=4"]


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def default_local_dir():
    # Keep generated evidence one directory above the git checkout so it can
    # never accidentally be included by a broad git add.
    workspace = Path(__file__).resolve().parents[3]
    return workspace / ".local" / "aosp-artifacts" / (datetime.datetime.now(datetime.timezone.utc).date().isoformat() + "-rebuild")


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w") as stream:
        json.dump(data, stream, indent=2, sort_keys=True)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


def atomic_text(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w") as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


def safe_destination(root, key):
    relative = PurePosixPath(key)
    if (not key or relative.is_absolute() or ".." in relative.parts
            or any(ord(c) < 32 for c in key)):
        raise ValueError("Unsafe artifact path")
    destination = root.joinpath(*relative.parts)
    if destination.resolve() != destination.absolute():
        raise ValueError("Refusing symlink in backup path")
    if destination == root:
        raise ValueError("Empty artifact path")
    return destination


def check_rsync_help(help_text):
    return "--append-verify" in help_text and "--protect-args" in help_text


def select_rsync(explicit=None):
    candidates = ([explicit] if explicit else
                  ["/opt/homebrew/bin/rsync", "/usr/local/bin/rsync", shutil.which("rsync")])
    checked = []
    for candidate in candidates:
        if not candidate or not Path(candidate).is_file():
            continue
        result = subprocess.run([candidate, "--help"], text=True, capture_output=True)
        checked.append(candidate)
        if result.returncode == 0 and check_rsync_help(result.stdout):
            return candidate
    raise RuntimeError("rsync needs --append-verify and --protect-args. macOS's bundled "
                       "rsync/openrsync may be too old; install Homebrew rsync and pass "
                       "--rsync /opt/homebrew/bin/rsync (or /usr/local/bin/rsync). "
                       "Checked: " + ", ".join(checked))


class Remote:
    def __init__(self, host, rsync, timeout):
        self.host, self.rsync, self.timeout = host, rsync, timeout

    def preflight(self):
        result = subprocess.run(["ssh", *SSH_OPTIONS, self.host, "rsync --help"],
                                text=True, capture_output=True, timeout=60, check=True)
        if not check_rsync_help(result.stdout):
            raise RuntimeError("Remote rsync lacks --append-verify or --protect-args")

    def query(self, payload):
        encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
        command = "python3 - " + shlex.quote(encoded)
        result = subprocess.run(["ssh", *SSH_OPTIONS, self.host, command],
                                input=REMOTE_SCRIPT, text=True, capture_output=True,
                                check=True, timeout=self.timeout)
        return json.loads(result.stdout)

    def inventory(self, roots):
        return self.query({"action": "inventory", "roots": roots})

    def hash(self, path):
        return self.query({"action": "hash", "path": path})

    def copy(self, source, destination):
        # --protect-args keeps spaces/metacharacters in remote filenames as data.
        # --append-verify verifies the old partial prefix during resumed transfer.
        subprocess.run([self.rsync, "--partial", "--append-verify", "--protect-args",
                        "--times", "--timeout=120", "-e", shlex.join(["ssh", *SSH_OPTIONS]),
                        "--", self.host + ":" + source, str(destination)],
                       check=True, timeout=self.timeout)


class Backup:
    def __init__(self, remote, local_dir, roots, settle_seconds):
        self.remote, self.root, self.roots = remote, local_dir.resolve(), roots
        self.settle_ns = int(settle_seconds * 1_000_000_000)
        self.root.mkdir(parents=True, exist_ok=True)
        self.index_path = self.root / "index.json"
        self.index = json.loads(self.index_path.read_text()) if self.index_path.exists() else {"files": {}}
        if self.index.get("host", remote.host) != remote.host or self.index.get("roots", roots) != roots:
            raise ValueError("Backup directory belongs to different remote roots/host; choose another directory")
        self.index.update({"schema": 1, "host": remote.host, "roots": roots})
        self.checked = set()

    def save(self):
        self.index["updated_at"] = utc_now()
        atomic_json(self.index_path, self.index)

    def already_verified(self, item, final, previous):
        verified = previous.get("verified", {})
        if (verified.get("remote_stat") != item["stat"] or not final.is_file()
                or final.stat().st_size != item["stat"]["size"]):
            return False
        local_stat = final.stat()
        signature = (item["key"], local_stat.st_size, local_stat.st_mtime_ns,
                     local_stat.st_ctime_ns, local_stat.st_ino)
        if signature not in self.checked:
            if sha256_file(final) != verified.get("sha256"):
                return False
            self.checked.add(signature)
        return True

    def transfer(self, item, record):
        key = item["key"]
        final = safe_destination(self.root, key)
        if self.already_verified(item, final, record):
            return "verified"
        before = self.remote.hash(item["path"])
        record["remote_before"] = before
        if not before["stable"] or before["stat"] != item["stat"]:
            return "pending: source changed before transfer"
        partial = safe_destination(self.root / ".partial", key)
        partial.parent.mkdir(parents=True, exist_ok=True)
        source_record = partial.with_name(partial.name + ".source.json")
        saved = json.loads(source_record.read_text()) if source_record.exists() else {}
        if (partial.exists() and
                (saved.get("sha256") != before["sha256"] or
                 partial.stat().st_size > before["stat"]["size"])):
            partial.unlink()  # Different generation: append cannot repair a rewritten prefix.
        atomic_json(source_record, before)
        self.remote.copy(item["path"], partial)
        after = self.remote.hash(item["path"])
        record["remote_after"] = after
        if (not after["stable"] or before["stat"] != after["stat"]
                or before["sha256"] != after["sha256"]):
            return "pending: source changed during transfer"
        local_digest = sha256_file(partial)
        record["local_sha256"] = local_digest
        if local_digest != after["sha256"] or partial.stat().st_size != after["stat"]["size"]:
            partial.unlink()  # A full-length damaged partial cannot be fixed by append mode.
            raise RuntimeError("Local SHA-256/size does not match remote; retry needs a fresh copy")
        final.parent.mkdir(parents=True, exist_ok=True)
        partial.replace(final)
        source_record.unlink(missing_ok=True)
        verified = {"sha256": local_digest, "remote_stat": after["stat"],
                    "verified_at": utc_now(), "remote_path": item["path"]}
        atomic_json(safe_destination(self.root / ".checksums", key + ".json"), verified)
        checksum_path = safe_destination(self.root / ".checksums", key + ".sha256")
        checksum_path.write_text(local_digest + "  " + key + "\n")
        record["verified"] = verified
        print("verified " + key, flush=True)
        return "verified"

    def run_once(self):
        inventory = self.remote.inventory(self.roots)
        self.index["last_scan_at"] = utc_now()
        self.index["missing_roots"] = inventory["missing_roots"]
        errors, pending, artifacts, verified = 0, 0, 0, 0
        seen = set()
        for item in inventory["files"]:
            key = item["key"]
            seen.add(key)
            artifacts += item["kind"] == "artifact"
            record = self.index["files"].setdefault(key, {})
            record.update({"kind": item["kind"], "remote_path": item["path"], "seen_at": utc_now()})
            age = inventory["now_ns"] - max(item["stat"]["mtime_ns"], item["stat"]["ctime_ns"])
            try:
                if item["kind"] == "artifact" and age < self.settle_ns:
                    status = "pending: source has not settled"
                else:
                    status = self.transfer(item, record)
                record["status"] = status
                if status == "verified":
                    verified += 1
                else:
                    pending += 1
                    print(status + " " + key, flush=True)
                record.pop("error", None)
            except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
                errors += 1
                record.update({"status": "error", "error": str(exc)})
                print("error " + key + ": " + str(exc), file=sys.stderr, flush=True)
            self.save()  # Each successful image is durable evidence before the next one.
        for key, record in self.index["files"].items():
            if key not in seen:
                record["status"] = "source missing; retained local snapshot"
        # A portable checksum list makes the backup independently auditable
        # without understanding index.json's schema. It contains only files
        # that passed the remote-before/after and local digest checks.
        checksum_lines = []
        for key, record in sorted(self.index["files"].items()):
            verified_record = record.get("verified")
            if verified_record and record.get("status", "").startswith(("verified", "source missing")):
                checksum_lines.append(verified_record["sha256"] + "  " + key)
        atomic_text(self.root / "SHA256SUMS", "".join(line + "\n" for line in checksum_lines))
        summary = {"artifacts_found": artifacts, "verified_files": verified,
                   "pending_files": pending, "errors": errors,
                   "missing_roots": inventory["missing_roots"]}
        self.index["last_scan"] = summary
        self.save()
        print(json.dumps(summary), flush=True)
        return 1 if errors or inventory["missing_roots"] else (3 if pending or not artifacts else 0)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true", help="One scan (default)")
    mode.add_argument("--watch", action="store_true", help="Scan repeatedly in this local process")
    parser.add_argument("--host", default="agentos-aosp", help="Existing SSH alias")
    parser.add_argument("--remote-out", default="/mnt/aosp-out/aosp-out",
                        help="Remote AOSP OUT_DIR or flat download directory")
    parser.add_argument("--evidence-root", action="append", default=None,
                        help="Curated remote evidence directory; repeatable (defaults to /mnt/aosp-out/evidence and /mnt/aosp-out/logs)")
    parser.add_argument("--local-dir", type=Path, default=default_local_dir(),
                        help="Local backup root (defaults outside this checkout under .local/aosp-artifacts/YYYY-MM-DD-rebuild)")
    parser.add_argument("--rsync", help="Path to a modern local rsync")
    parser.add_argument("--interval", type=float, default=60)
    parser.add_argument("--settle-seconds", type=float, default=30, help="Minimum image/package mtime and ctime age")
    parser.add_argument("--timeout", type=float, default=7200, help="Maximum seconds per transfer or remote hash")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]*", args.host):
        parser.error("--host must be an SSH alias")
    if args.interval <= 0 or args.timeout <= 0 or args.settle_seconds < 0:
        parser.error("interval/timeout must be positive and settle-seconds nonnegative")
    args.evidence_root = args.evidence_root or ["/mnt/aosp-out/evidence", "/mnt/aosp-out/logs"]
    paths = [args.remote_out, *args.evidence_root]
    if any(not p.startswith("/") or any(ord(c) < 32 for c in p) for p in paths):
        parser.error("Remote roots must be absolute paths without control characters")
    roots = [["artifacts", args.remote_out, False]] + [
        ["evidence-" + str(i), p, True] for i, p in enumerate(args.evidence_root)]
    try:
        rsync = select_rsync(args.rsync)
        args.local_dir.mkdir(parents=True, exist_ok=True)
        with (args.local_dir / ".backup.lock").open("w") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise RuntimeError("Another backup process owns this destination")
            remote = Remote(args.host, rsync, args.timeout)
            remote.preflight()
            backup = Backup(remote, args.local_dir, roots, args.settle_seconds)
            print("Backing up with " + rsync + " to " + str(backup.root), flush=True)
            while True:
                try:
                    result = backup.run_once()
                except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
                    if not args.watch:
                        raise
                    print("scan error: " + str(exc), file=sys.stderr, flush=True)
                if not args.watch:
                    return result
                time.sleep(args.interval)
    except KeyboardInterrupt:
        return 130
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        print("backup failed: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
