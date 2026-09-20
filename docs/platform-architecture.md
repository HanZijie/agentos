# Platform architecture

This file is kept as a compatibility link for the earlier Android integration notes. The source of truth is [system-architecture.md](system-architecture.md).

The target is a system-managed `sideagentd` process plus `AgentManagerService` in `system_server`. The current Android app under `frontends/agenriod` is a migration reference and frontend candidate; its embedded `AgentService` is not the final system host.
