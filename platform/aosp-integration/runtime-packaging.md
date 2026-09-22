# Runtime packaging boundary

The repository already contains a Node-based reference runtime, QuickJS Web
API shims, and a Pi ACP worker. These are reference code, not Android system
artifacts. The AOSP packaging gate must therefore reject an unpinned runtime
instead of silently packaging a host `node_modules` tree.

`runtime-packaging.json` is the manifest consumed by
`tools/aosp/build-agentos.py`. Each entry becomes `ready` only after it has a
versioned source, license record, target ABI, reproducible artifact, and an
Android module name. The current entries intentionally remain pending:

- Node needs a pinned Android host/runtime binary and its system call policy.
- QuickJS needs a pinned source release, `cc_library_static`/binary module,
  JNI or Binder host bridge, and SELinux rules.
- Pi is currently a Node reference worker. Its JavaScript bundle must be
  produced without credentials or runtime `node_modules`, then executed by a
  separately packaged engine.

The first reproducible bundle step is available now:

```bash
node runtime/build-aosp.mjs --out "$STAGING/agentos-pi-runtime.cjs"
node -e 'const m=require(process.argv[1]); if (typeof m.PiWorker !== "function") process.exit(1)' "$STAGING/agentos-pi-runtime.cjs"
```

The output is a CommonJS bundle with a dependency manifest. It does not claim
that Node is an Android product binary; the Pi entry remains `reference_only`
until a pinned Android Node runtime and its system policy are supplied.

The runtime process must stay outside `system_server`. Product integration will
add the runtime binary/bundle to `PRODUCT_PACKAGES`, an init service, a private
data directory, and a dedicated SELinux domain only after the module's ABI and
smoke test pass. The package manifest is not a claim that any of these
artifacts are already in the Cuttlefish image.

Use the unified orchestrator for the eventual order:

```text
prepare -> soong -> build -> package -> verify -> backup
```

`package` fails closed while any runtime entry is not `ready`. `verify` uses
the Cuttlefish checker and records ADB, boot, service, SELinux, and runtime
evidence. The lock and separate `--out-dir` prevent this flow from competing
with another AOSP build.
