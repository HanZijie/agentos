# AgentOS system integration bootstrap v1

This document freezes the first AOSP integration slice. It is a bootstrap
contract, not a claim that the current Android app has already become a system
service.

## Plugin discovery

An Android Plugin package declares one exported endpoint service:

```xml
<service
    android:name=".AgentPluginEndpointService"
    android:exported="true"
    android:permission="com.example.agentos.permission.BIND_AGENT_PLUGIN">
  <intent-filter>
    <action android:name="agentos.intent.action.PLUGIN_ENDPOINT" />
  </intent-filter>
  <meta-data
      android:name="agentos.plugin.id"
      android:value="com.example.notes" />
</service>
```

`AgentManagerService` discovers the endpoint through `PackageManager` at user
start and on package add/replace/remove broadcasts. Discovery does not depend
on the Plugin Activity being open. The endpoint is bound only after the user
has enabled that Plugin; the bind uses `BIND_AUTO_CREATE` and a target
`UserHandle`. Each successful bind creates a fresh `pluginSessionId`.

An App may also start its endpoint process and register through the same
versioned Binder endpoint. That is a liveness optimization; it is not the
source of identity. Package name, UID, signature, declared permission and
manifest component remain the identity facts.

## MCP ownership

The Plugin descriptor may include MCP server declarations. The system keeps
authentication material out of catalog and event output. In the bootstrap
slice, `sideagentd` does not yet execute MCP calls; the AOSP overlay only
establishes discovery, enablement, bind, handshake and health. MCP execution
moves behind the capability seam in the next slice.

## Freezer invariant

While a Plugin session has an active lease or an in-flight call, its endpoint
must remain serviceable. The first implementation deliberately starts with
`BIND_AUTO_CREATE` and no `BIND_WAIVE_PRIORITY`; the target AOSP build must
measure whether this is enough to keep the endpoint out of cached-app freezer
and phantom-process-killer paths. No broad freezer exemption is added before
that measurement.

The platform test matrix must cover:

1. cached-app freezer on and off;
2. active lease with no in-flight call;
3. in-flight call crossing a freezer attempt;
4. idle unbind, process death and rebind with a new session id;
5. package update, user stop and user disable revoking the session.

The detailed verification and any required ActivityManager changes remain in
[`aosp-todo.md`](../../../platform/aosp-integration/aosp-todo.md).
