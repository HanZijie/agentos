# Runtime packaging boundary

The repository contains a Node-based reference runtime, QuickJS Web API shims,
and a Pi ACP worker. Those remain reference code. The Android system path now
uses the native `sideagentd` Worker for MiniMax-M3 and Jev, so the packaging
gate records that Worker as an integrated `sideagentd` module instead of
pretending a host `node_modules` tree is an Android runtime.

`runtime-packaging.json` is the manifest consumed by
`tools/aosp/build-agentos.py`. An integrated entry is accepted only when its
source and Android module are present in the same AOSP checkout. Reference-only
entries are kept for the non-system runtime and are excluded from the product
package gate:

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

The runtime process stays outside `system_server`. The native Worker is built
inside `sideagentd`, which is added to `PRODUCT_PACKAGES` with its init service,
private data directory and dedicated SELinux domain. The manifest still does
not claim that a particular Cuttlefish image contains the module until the
matching AOSP build and device test pass.

Use the unified orchestrator for the eventual order:

```text
prepare -> soong -> build -> package -> verify -> backup
```

`package` fails closed unless every non-reference entry is integrated or ready.
`verify` uses
the Cuttlefish checker and records ADB, boot, service, SELinux, and runtime
evidence. The lock and separate `--out-dir` prevent this flow from competing
with another AOSP build.
