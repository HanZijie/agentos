import { SessionStore } from './store.mjs';
import { SessionScheduler } from './scheduler.mjs';
import { processWorkerFactory } from './workers/process-worker.mjs';

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
