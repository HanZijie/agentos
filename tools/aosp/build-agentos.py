#!/usr/bin/env python3
"""Orchestrate an AgentOS AOSP build without hiding failed stages.

The script is deliberately a thin, lock-protected wrapper around repo,
wire-platform.py, envsetup/lunch, Soong and make.  It never starts a second
build in the same output directory and it does not pretend that a runtime is
packaged until its pinned source and artifact checks pass.
"""

from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from typing import Any, NoReturn


TARGET_RE = re.compile(r"^[a-zA-Z0-9_.+-]+$")
STAGES = ("prepare", "soong", "build", "package", "verify", "all")


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def fail(message: str) -> "NoReturn":
    raise SystemExit(f"build-agentos: {message}")


def checked(value: str, label: str) -> str:
    if not TARGET_RE.fullmatch(value):
        fail(f"invalid {label}: {value!r}")
    return value


def run(argv: list[str], *, cwd: Path, env: dict[str, str], log: Path,
        dry_run: bool) -> int:
    log.parent.mkdir(parents=True, exist_ok=True)
    command = " ".join(subprocess.list2cmdline([arg]) for arg in argv)
    with log.open("a") as stream:
        stream.write(f"\n[{now()}] {command}\n")
        stream.flush()
        if dry_run:
            stream.write("DRY_RUN\n")
            return 0
        process = subprocess.run(argv, cwd=cwd, env=env, text=True,
                                 stdout=stream, stderr=subprocess.STDOUT)
        stream.write(f"[{now()}] exit={process.returncode}\n")
        return process.returncode


def run_shell(command: str, *, cwd: Path, env: dict[str, str], log: Path,
              dry_run: bool) -> int:
    # The command is assembled only from fixed shell fragments and validated
    # target values.  Runtime user input is passed through environment vars.
    return run(["bash", "-lc", command], cwd=cwd, env=env, log=log,
               dry_run=dry_run)


def read_config(path: Path) -> dict[str, Any]:
    try:
        config = json.loads(path.read_text())
    except (OSError, ValueError) as exc:
        fail(f"cannot read runtime config {path}: {exc}")
    if config.get("schema") != 1:
        fail(f"unsupported runtime config schema in {path}")
    if not isinstance(config.get("runtimes"), list):
        fail("runtime config must contain a runtimes list")
    return config


def package_report(config: dict[str, Any], root: Path) -> tuple[bool, list[str]]:
    failures: list[str] = []
    for item in config["runtimes"]:
        ident = item.get("id", "<unknown>")
        if item.get("status") != "ready":
            failures.append(f"{ident}: status={item.get('status', 'missing')}")
            continue
        source = item.get("source")
        if not isinstance(source, str) or not (root / source).exists():
            failures.append(f"{ident}: source is not present: {source!r}")
        artifact = item.get("artifact")
        if not isinstance(artifact, str) or not (root / artifact).is_file():
            failures.append(f"{ident}: artifact is not present: {artifact!r}")
    return not failures, failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("aosp_root", type=Path)
    parser.add_argument("--product", default="aosp_cf_x86_64_only_phone")
    parser.add_argument("--release", default="aosp_current")
    parser.add_argument("--variant", default="userdebug")
    parser.add_argument("--out-dir", type=Path)
    parser.add_argument("--evidence-dir", type=Path)
    parser.add_argument("--runtime-config", type=Path)
    parser.add_argument("--stage", choices=STAGES, default="all")
    parser.add_argument("-j", "--jobs", type=int, default=0)
    parser.add_argument("--target", choices=("cuttlefish", "pixel8"), default="cuttlefish")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = args.aosp_root.resolve()
    if not (root / ".repo/manifests/default.xml").is_file():
        fail(f"not an AOSP repo checkout: {root}")
    for value, label in ((args.product, "product"), (args.release, "release"),
                         (args.variant, "variant")):
        checked(value, label)
    if args.jobs < 0:
        fail("--jobs cannot be negative")

    out = (args.out_dir or root / "out-agentos").resolve()
    evidence = (args.evidence_dir or out / "evidence").resolve()
    repo_root = Path(__file__).resolve().parents[2]
    config_path = (args.runtime_config or
                   repo_root / "platform/aosp-integration/runtime-packaging.json").resolve()
    out.mkdir(parents=True, exist_ok=True)
    evidence.mkdir(parents=True, exist_ok=True)
    lock_path = out / ".agentos-build.lock"
    lock = lock_path.open("a+")
    try:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        fail(f"another AgentOS build owns {lock_path}; choose another --out-dir")

    env = os.environ.copy()
    env.update({"OUT_DIR": str(out), "OUT_DIR_COMMON_BASE": str(out.parent),
                "TARGET_PRODUCT": args.product,
                "TARGET_RELEASE": args.release,
                "TARGET_BUILD_VARIANT": args.variant})
    jobs = str(args.jobs or os.cpu_count() or 1)
    log = evidence / "build-agentos.log"
    report: dict[str, Any] = {"started_at": now(), "stage": args.stage,
                              "product": args.product, "release": args.release,
                              "variant": args.variant, "out_dir": str(out),
                              "target": args.target, "commands": []}

    def stage(name: str, command: list[str] | str) -> None:
        if args.stage not in ("all", name):
            return
        report["commands"].append({"stage": name, "command": command})
        result = (run(command, cwd=root, env=env, log=log, dry_run=args.dry_run)
                  if isinstance(command, list) else
                  run_shell(command, cwd=root, env=env, log=log,
                            dry_run=args.dry_run))
        if result:
            report["failed_stage"] = name
            (evidence / "build-agentos.report.json").write_text(
                json.dumps(report, indent=2) + "\n")
            return fail(f"stage {name} failed with exit {result}; see {log}")

    try:
        stage("prepare", [sys.executable, str(repo_root /
              "tools/aosp/wire-platform.py"), str(root),
              "--target", args.target, "--apply"])
        stage("soong", "source build/envsetup.sh; lunch \"$TARGET_PRODUCT-$TARGET_RELEASE-$TARGET_BUILD_VARIANT\"; m nothing -j" + jobs)
        stage("build", "source build/envsetup.sh; lunch \"$TARGET_PRODUCT-$TARGET_RELEASE-$TARGET_BUILD_VARIANT\"; m -j" + jobs)
        if args.stage in ("all", "package"):
            config = read_config(config_path)
            ready, failures = package_report(config, root)
            report["runtime_package"] = {"ready": ready, "failures": failures,
                                          "config": str(config_path)}
            if not ready:
                fail("runtime packaging is not ready: " + "; ".join(failures))
        stage("verify", "echo 'verification is delegated to tools/aosp/check-cuttlefish.py'")
        report["finished_at"] = now()
        report["status"] = "dry-run" if args.dry_run else "ok"
        (evidence / "build-agentos.report.json").write_text(
            json.dumps(report, indent=2) + "\n")
        return 0
    finally:
        fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
        lock.close()


if __name__ == "__main__":
    main()
