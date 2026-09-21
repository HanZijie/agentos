# AgentOS AOSP bootstrap overlay

This directory is copied into a local AOSP checkout by
`tools/aosp/prepare-overlay.sh`. It is deliberately small and does not include
an AOSP checkout or product-specific proprietary files.

The first slice provides:

- a versioned health AIDL and native `sideagentd` Binder service;
- init and SELinux bootstrap files;
- a control-plane skeleton that discovers Plugin endpoint services from the
  manifest, tracks per-user enablement, binds with `BIND_AUTO_CREATE`, and
  creates a fresh session on each bind;
- explicit freezer verification invariants without a broad exemption.

Before building a device image, the target AOSP branch must add the overlay to
`PRODUCT_SOONG_NAMESPACES`, add `sideagentd` to `PRODUCT_PACKAGES`, allocate a
dedicated `sideagent` AID, add `agentos_system_aidl-V1-java` to the selected
`services.core` Java module, wire `AgentManagerService` into `SystemServer`,
and merge the sepolicy files. None of those target-tree mutations are performed
by this repository automatically.
