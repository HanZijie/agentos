# Cuttlefish host recovery

The pinned stock Cuttlefish fallback uses build **16373615**. The host package
runs in an Ubuntu 24.04 amd64 container because the server's Ubuntu 20.04 host
does not provide the same userspace ABI.

The reproducible host recipe is [tools/aosp/cuttlefish-host/Dockerfile](../../tools/aosp/cuttlefish-host/Dockerfile). It pins the Ubuntu base by digest and
installs the package versions recorded in `host-packages.lock`. The recipe also
installs the Cuttlefish capability helper at
`/usr/lib/cuttlefish-common/bin/capability_query.py` and creates the
`cvdnetwork` group. Both are required by the stock host binaries; an apt-only
image is insufficient.

The recipe was built on `agentos-aosp` as
`agentos/cuttlefish-host:stock-16373615-rebuilt-v2`. A disposable container
using that image launched the official host package with QEMU and completed a
real guest boot. Evidence is kept outside this repository:

- `stock-plugin-20260923/rebuilt-test-v2b/launch.txt` contains `Virtual device booted successfully` and `VIRTUAL_DEVICE_BOOT_COMPLETED`.
- `stock-plugin-20260923/rebuilt-test-v2b/poll.txt` records ADB `127.0.0.1:6521` as `device` and `sys.boot_completed=1`.
- `cuttlefish-host-cache/cuttlefish-host-stock-16373615-rebuilt-v2.tar.gz` is the exported image with SHA-256 recorded in `SHA256SUMS.rebuilt-v2`.

The existing live `agentos-cf` container was not stopped or modified while the
disposable image was tested. A clean-host rebuild from the Dockerfile has not
been tested; the recipe depends on network access to the pinned Ubuntu mirror.
The image and host package are still stock and contain no AgentOS system
service.

## AgentOS r34 image validation

The replacement server built `android-15.0.0_r34` with
`aosp_cf_x86_64_only_phone-trunk_staging-userdebug` and produced the Cuttlefish
images plus host package. The final `m droid -j96` log returned `BUILD_RC=0`.
The image set and hashes are recorded in `.local/aosp-artifacts/2026-09-23-aosp-final/`.

A second Cuttlefish instance booted the custom image on ADB `127.0.0.1:6521` with
`sys.boot_completed=1`. Runtime checks found `sideagentd` under UID 1096,
`agentos` and `agentos.sideagentd` in the service manager, and
`cmd agentos health` returned `state=ready`. Installing the built
`AgentOsPluginProbe` showed manifest discovery; enabling it produced an active
record and an `AgentOsProbe: open` handshake log. The probe's cgroup freeze
files were both `0` during the check. The Cuttlefish host Bluetooth dependency
was disabled for this service-focused run; Bluetooth readiness is a separate
follow-up.

## App-level validation on stock Cuttlefish

The repository's debug APKs were built, installed into the live stock guest,
and the single real cross-app test passed:

```text
com.example.agenriod.agent.NotesPluginCrossAppTest
OK (1 test), Time: 3.739
```

That test exercises cross-UID Binder registration, Notes' own Streamable HTTP
MCP calls, host process restart and plugin process cleanup. It does not prove
`AgentManagerService`, `sideagentd`, system-server discovery, capability leases,
or the final platform binding policy.

The natural-freezer probe was also run with the repository tool. It returned
`NOT_OBSERVED`: the Notes PID stayed unchanged and `cmd activity isfrozen`
remained `false` for the 40-second window. This is an observation of the
ordinary app prototype using its current low-priority binding; it is not proof
that the target system-service binding will or will not be freezer-exempt.
