import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, writeFileSync, readFileSync, closeSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { check, sequence, SchedulerError } from './errors.mjs';

// One owner per database. A stale process lock is reclaimed only after ESRCH.
// SQLite FULL/WAL makes each Session mutation and its events one durable commit.
export class SessionStore {
  constructor(filename, { retainEvents = 10000 } = {}) {
    check(Number.isSafeInteger(retainEvents) && retainEvents > 0, 'invalid_config');
    this.retainEvents = retainEvents;
    this.subscriptions = new Set();
    this.token = randomUUID();
    if (filename !== ':memory:') {
      filename = resolve(filename);
      mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
      this.lock = `${filename}.lock`;
      try { this.acquire(); } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const owner = JSON.parse(readFileSync(this.lock, 'utf8'));
        check(Number.isSafeInteger(owner.pid) && owner.pid > 0, 'store_locked');
        try { process.kill(owner.pid, 0); throw new SchedulerError('store_locked'); }
        catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
        unlinkSync(this.lock);
        this.acquire();
      }
      const fd = openSync(filename, 'a', 0o600); closeSync(fd);
    }
    try {
      this.db = new DatabaseSync(filename);
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
        CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS events(session TEXT NOT NULL, seq INTEGER NOT NULL, body TEXT NOT NULL,
          PRIMARY KEY(session, seq));`);
    } catch (error) { this.release(); throw error; }
  }
  acquire() {
    const fd = openSync(this.lock, 'wx', 0o600);
    try { writeFileSync(fd, JSON.stringify({ pid: process.pid, token: this.token })); }
    finally { closeSync(fd); }
  }
  release() {
    if (this.lock && JSON.parse(readFileSync(this.lock, 'utf8')).token === this.token) unlinkSync(this.lock);
  }
  get(id) {
    const row = this.db.prepare('SELECT body FROM sessions WHERE id=?').get(id);
    check(row, 'session_not_found');
    return JSON.parse(row.body);
  }
  list() { return this.db.prepare('SELECT body FROM sessions ORDER BY id').all().map(r => JSON.parse(r.body)); }
  transaction(id, mutate, initial) {
    const events = [];
    this.db.exec('BEGIN IMMEDIATE');
    let result;
    try {
      const s = initial ? structuredClone(initial) : this.get(id);
      const emit = (eventType, payload = {}, taskId = null) => {
        const seq = sequence(s.sequence) + 1n;
        check(seq <= 9223372036854775807n, 'sequence_exhausted');
        s.sequence = String(seq);
        const event = { sessionId: id, taskId, sequence: s.sequence, eventType, payload, timestamp: Date.now() };
        this.db.prepare('INSERT INTO events VALUES(?,?,?)').run(id, seq, JSON.stringify(event));
        events.push(event);
      };
      result = mutate(s, emit);
      if (initial) this.db.prepare('INSERT INTO sessions VALUES(?,?)').run(id, JSON.stringify(s));
      else this.db.prepare('UPDATE sessions SET body=? WHERE id=?').run(JSON.stringify(s), id);
      this.db.prepare('DELETE FROM events WHERE session=? AND seq <= ?').run(id,
        BigInt(s.sequence) - BigInt(this.retainEvents));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    // Never call application code while holding a transaction.
    for (const event of events) for (const sub of this.subscriptions) if (sub.id === id) sub.push(event);
    return structuredClone(result);
  }
  oldest(id) {
    const stmt = this.db.prepare('SELECT min(seq) AS seq FROM events WHERE session=?');
    stmt.setReadBigInts(true);
    return String(stmt.get(id).seq ?? (BigInt(this.get(id).sequence) + 1n));
  }
  events(id, afterSequence = '0') {
    const after = sequence(afterSequence);
    const s = this.get(id);
    check(after <= BigInt(s.sequence), 'invalid_cursor');
    check(after >= BigInt(this.oldest(id)) - 1n, 'cursor_too_old');
    return this.db.prepare('SELECT body FROM events WHERE session=? AND seq>? ORDER BY seq').all(id, after)
      .map(r => JSON.parse(r.body));
  }
  snapshot(id) {
    const s = this.get(id);
    // Checkpoints, credentials, prompts and raw lease handles stay private.
    const task = t => ({ taskId: t.id, state: t.state, error: t.error, attempts: t.attempts,
      queueDeadline: t.queueDeadline, executionDeadline: t.executionDeadline });
    return { sessionId: id, userId: s.userId, state: s.state, priority: s.priority,
      activeTask: s.active ? task(s.tasks.find(t => t.id === s.active)) : null,
      queuedTasks: s.tasks.filter(t => t.state === 'queued').map(task),
      tasks: s.tasks.map(task), recoveryRequired: s.tasks.some(t => t.state === 'unknown'),
      pauseReason: s.pauseReason, snapshotSequence: s.sequence, oldestRetainedSequence: this.oldest(id),
      updates: s.updates };
  }
  subscribe(id, after = '0', { maxBuffer = 256 } = {}) {
    check(Number.isSafeInteger(maxBuffer) && maxBuffer > 0, 'invalid_config');
    const replay = this.events(id, after);
    check(replay.length <= maxBuffer, 'buffer_overflow', 'Fetch a newer snapshot or increase replay buffer');
    const store = this;
    let queue = replay, pending, done = false, error;
    const sub = {
      id,
      push(event) {
        if (done) return;
        if (pending) { const p = pending; pending = null; p.resolve({ value: structuredClone(event), done: false }); }
        else if (queue.length < maxBuffer) queue.push(structuredClone(event));
        else { error = new SchedulerError('buffer_overflow'); sub.return(); }
      },
      next() {
        if (error) return Promise.reject(error);
        if (queue.length) return Promise.resolve({ value: queue.shift(), done: false });
        if (done) return Promise.resolve({ done: true });
        check(!pending, 'concurrent_read');
        return new Promise((resolve, reject) => { pending = { resolve, reject }; });
      },
      return() {
        done = true; queue = []; store.subscriptions.delete(sub);
        if (pending) { pending.resolve({ done: true }); pending = null; }
        return Promise.resolve({ done: true });
      },
      [Symbol.asyncIterator]() { return this; },
    };
    // Replay and registration run synchronously, so no commit can fall between them.
    store.subscriptions.add(sub);
    return sub;
  }
  close() {
    for (const sub of this.subscriptions) sub.return();
    this.db.close(); this.release();
  }
}
