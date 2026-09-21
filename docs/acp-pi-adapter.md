# Pi ACP adapter

`runtime/src/acp-adapter.js` is the first thin adapter from Pi's
`AgentSession` to ACP v1. It is an independent stdio JSON-RPC entry point; it
does not replace `sideagentd` and does not own Android transport, identity,
event storage, idempotency, or recovery.

The Scheduler uses the same adapter as a Worker through
`runtime/src/pi-worker.js`. In that mode the adapter is driven by one
Scheduler assignment at a time; the Scheduler owns the AgentOS `taskId`,
idempotency, Event Store, subscriptions, cancellation deadlines, crash
fencing, and recovery. Pi session entries are only a private checkpoint passed
back to the Scheduler after a successful Attempt.

## Implemented boundary

- `initialize`, `session/new`, `session/prompt`, `session/cancel`,
  `session/close`, and `authenticate`;
- text, image, resource-link, and embedded-text prompt blocks;
- assistant/thought chunks and tool-call lifecycle updates;
- tool authorization through standard `session/request_permission`;
- Pi's own `AgentSession` lifecycle and session persistence.

The adapter advertises only the capabilities that are implemented. It does not
advertise session load/resume, MCP transports, terminal delegation, or
filesystem delegation.

## Configuration seam

The adapter accepts an internal placeholder:

```js
{ mcp?: unknown, plugins?: unknown, hooks?: unknown }
```

Non-empty values are rejected explicitly. Existing runtime Plugin/MCP/Hooks
code remains a migration reference and is not silently treated as ACP adapter
configuration. A future implementation can replace this seam after the
sideagentd policy and public configuration contract are frozen.

## Run and test

```bash
npm ci --prefix runtime
npm run test:acp --prefix runtime
npm run test:scheduler --prefix runtime
npm run test:plugin --prefix runtime
npm run start:acp --prefix runtime
```

The last command reads ACP JSONL from stdin and writes ACP JSONL to stdout.
