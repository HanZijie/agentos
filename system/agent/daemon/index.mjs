import { SessionStore } from './store.mjs';
import { SessionScheduler } from './scheduler.mjs';
import { PluginBroker, validateDescriptor } from './plugin-broker.mjs';
import { processWorkerFactory } from './workers/process-worker.mjs';

export { SessionStore, SessionScheduler, PluginBroker, validateDescriptor };

/**
 * Creates the process-local sideagentd data plane. Android Binder and the
 * frontend protocol can call this interface later without owning scheduling.
 */
export function createSideagentd({ dbPath, workerFactory = processWorkerFactory, config, now, retainEvents } = {}) {
  if (!dbPath) throw new Error('dbPath is required');
  const store = new SessionStore(dbPath, { retainEvents });
  const scheduler = new SessionScheduler(store, workerFactory, { config, now });
  return {
    store,
    scheduler,
    async shutdown() { await scheduler.shutdown(); store.close(); },
  };
}

/**
 * Wires a PluginBroker to the Scheduler's frozen lease semantics
 * (session-scheduling-v1 §8): leases are validated against the Session record,
 * and endpoint revocations propagate to scheduler.revokePlugin.
 */
export function createPluginBroker(scheduler, store, options = {}) {
  const now = options.now ?? Date.now;
  return new PluginBroker({
    ...options,
    now,
    validateLease: ({ leaseId, sessionId, pluginSessionId, capability }) => {
      try {
        const s = store.get(sessionId);
        return s.leases.some(l => l.valid && l.leaseId === leaseId && l.pluginSessionId === pluginSessionId
          && l.workerGeneration === s.workerGeneration && l.expiresAt > now() && l.capabilities.includes(capability));
      } catch { return false; }
    },
    hasActiveLeases: pluginSessionId => store.list()
      .some(s => s.leases.some(l => l.valid && l.pluginSessionId === pluginSessionId && l.expiresAt > now())),
    onSessionRevoked: (pluginSessionId, reason) => {
      scheduler.revokePlugin(pluginSessionId, reason === 'binder_death' ? 'lease_revoked' : reason);
      options.onSessionRevoked?.(pluginSessionId, reason);
    },
  });
}
