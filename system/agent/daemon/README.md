# sideagentd Scheduler prototype

This directory is the process-local first implementation of the AgentOS data
plane. It intentionally has no Android Binder, Activity dependency, or model
network dependency:

```text
SessionStore (SQLite WAL / durable events)
        ↓
SessionScheduler (serial per Session, bounded cross-Session concurrency)
        ↓
Worker (fake subprocess or Pi ACP worker)
```

The Scheduler owns Session state, task idempotency, priority/fairness,
cancellation, deadlines, crash fencing, event sequencing, snapshots, and
Plugin capability leases. A Worker owns only one assigned runtime attempt and
returns events/results to the Scheduler. Pi never owns AgentOS event storage,
recovery, frontend subscriptions, or deduplication.

Run the prototype daemon:

```bash
AGENTOS_SESSION_DB=/tmp/agentos.sqlite node system/agent/daemon/main.mjs
```

Worker kinds are selected by `createSession({ worker: "fake" | "pi" })`.
`fake` is used by scheduler tests; `pi` starts the existing Pi ACP adapter
through a child worker and carries a private Pi session checkpoint between
Attempts. Unknown Attempts are never automatically replayed.

## Plugin Broker

`plugin-broker.mjs` is the reference implementation of
[Plugin Injection Contract v1](../contracts/plugin-injection-v1.md): descriptor
v3 validation, per-user enablement, on-demand bind/handshake with fresh
`pluginSessionId`s, tool invocation (request ids, deadlines, cancellation,
idempotency keys, no auto-replay) and resource collection into per-turn
system-reminder blocks that never touch the Session store. The "bind" boundary
is an injected factory returning `{ endpoint, linkToDeath, unbind }`; Android
Binder, freezer exemptions and SELinux stay platform work
([aosp-todo](../../../platform/aosp-integration/aosp-todo.md) §5).
`createPluginBroker(scheduler, store)` in `index.mjs` wires lease validation
and death revocation to the Scheduler's frozen lease semantics. Contract §13
reference tests 1–12 live in `test/plugin-broker.test.mjs`; feeding collected
reminders into the worker model input is the next integration step and is not
part of this broker.

Run all daemon tests:

```bash
node --test system/agent/daemon/test/*.test.mjs
```
