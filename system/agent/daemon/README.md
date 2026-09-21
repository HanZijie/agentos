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
