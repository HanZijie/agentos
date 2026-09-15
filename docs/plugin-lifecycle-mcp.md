# Plugin process lifecycle and MCP

## Activation contract

A separately installed Android Plugin is active only while its owner package has a live process that has registered an `AgentPluginService` endpoint.

- The Plugin calls `PluginProcessRegistration` from `Application.onCreate`.
- The Host's `PluginHostService` is a registration broker in `:agent`; its package query reads only manifest metadata and never starts a Plugin process.
- The registration is held by a Binder endpoint. Binder death removes the Plugin immediately from the Host catalog.
- Moving the Plugin Activity to the background keeps the process registration alive. Force-stop, process death, or an explicit close removes the Plugin tools.
- A Host restart does not require the Plugin UI to be reopened: the existing registration binding reconnects and registers again. The Plugin's own process remains the authority for its lifetime.
- A tool call already in flight is allowed to settle. New calls after registration death fail with an inactive-plugin error and are never replayed.

This is process liveness, not foreground visibility. Android may still kill a background process under memory pressure; the Binder death path then withdraws its tools.

## Descriptor version 2

Version 1 native tools remain supported. Version 2 may add `mcpServers` without putting credentials into the public catalog:

```json
{
  "protocolVersion": 2,
  "id": "notes",
  "name": "Notes",
  "tools": [{ "name": "notes.search", "inputSchema": { "type": "object" } }],
  "mcpServers": [{
    "id": "notes",
    "transport": "streamable-http",
    "url": "https://example.test/mcp",
    "headers": { "Authorization": "Bearer token-held-by-plugin" }
  }]
}
```

External Plugin credentials stay in the Host's in-memory registration record. Agenriod-local manifests are stored in its app-private files directory. In both cases headers are omitted from the public catalog and System Prompt. Native and MCP tool names are kept in separate namespaces (`mcp.<server>.<tool>` internally); the bundled runtime gives every tool a bounded, deterministic model name.

## Streamable HTTP MCP

`mcp-client` implements the initial Streamable HTTP client seam:

- `initialize`, negotiated protocol version, and `notifications/initialized`;
- `tools/list` pagination and `tools/call`;
- `application/json` and `text/event-stream` responses;
- server `tools/list_changed` notifications and `ping` requests;
- session IDs, explicit `DELETE` cleanup, and 404 session expiry;
- HTTPS for remote endpoints and loopback HTTP for on-device/local servers;
- bounded request/response sizes, header validation, timeouts, no redirect credential forwarding, and no automatic replay of `tools/call`.

OAuth discovery, stdio transport, task-mode MCP requests, and server-to-client resource/prompt subscriptions are outside this version. They can be added without changing the Android Plugin registration seam.

## Verification

```bash
./scripts/android.sh instrumentation
node runtime/runtime-plugin-test.mjs
```

The device suite includes process-gated Plugin tools, Host restart re-registration, Notes MCP over loopback HTTP, and the official TypeScript SDK Streamable HTTP interoperability test.
