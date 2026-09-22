# AgentOS AOSP bootstrap overlay

This directory contains the AgentOS source overlay for `android-15.0.0_r34`.
It includes neither an AOSP checkout nor proprietary device files. The wiring
and probe were saved in `62223a7`; subsequent commits add target selection,
checkout revision checks, external backups and wiring tests.

The first slice provides:

- a versioned health AIDL and native `sideagentd` Binder service;
- init and SELinux bootstrap files;
- a control plane that discovers Plugin endpoint services from the manifest,
  checks package/UID/signer/version identity, persists per-user grants, handles
  user lifecycle events, binds with `BIND_AUTO_CREATE`, and creates a fresh
  session on each bind with disconnect retry;
- basic `cmd agentos health|plugins|enable|disable` and `dumpsys agentos`
  diagnostics; control Binder methods currently require root or system UID;
- the real `AgentOsPluginProbe` test APK for discovery, binding, handshake and
  process-lifecycle checks; it has no model, MCP or tool/resource pipeline;
- explicit freezer verification invariants without a broad exemption.

From the AgentOS repository root, preview and apply the complete wiring:

```bash
python3 tools/aosp/wire-platform.py /path/to/aosp
python3 tools/aosp/wire-platform.py /path/to/aosp --apply
```

The default `cuttlefish` target does not require shusky; use `--target pixel8`
explicitly for Pixel 8. The script checks the manifest default revision and
the participating projects' HEADs against the pinned tag, copies this overlay,
adds the product namespace and `sideagentd` package, allocates AID 1096,
adds the versioned Java dependency, starts `AgentManagerService` from
`SystemServer`, defines the binding permission and merges platform-private
SELinux policy. Existing files are backed up alongside the AOSP root under
`agentos-wiring-backups/`, outside Soong's source scan. Inspect the dry-run diff
before applying to a checkout with local changes. `prepare-overlay.sh` remains
a copy-only helper and does not perform these platform modifications.

The probe module is available to build explicitly as `AgentOsPluginProbe`;
wiring does not include it in `PRODUCT_PACKAGES`. Its presence as source is not
evidence of installation or successful discovery. Wiring fixture tests verify
target selection, rejection of wrong revisions, idempotence and backups; they
do not compile or boot Android.

As of 2026-09-22, official stock Cuttlefish build 16373615 image/host archives
are verified locally under
`../.local/aosp-artifacts/2026-09-22-rebuild/fallback/` (relative to the repository
root), but boot is not complete. Those stock archives do not contain this
overlay. There is no completed AgentOS image or AgentOS device validation in
the current rebuild. The synchronous handshake can still exhaust its two
workers if endpoints never return; an asynchronous or isolated handshake,
full MCP/capability transport and freezer tests remain pending. See the
[platform TODO](../aosp-todo.md) for completion gates.
