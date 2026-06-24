import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, test } from 'bun:test';
import { captureServerError, captureSlug, redactPayload } from './captureError';
import { migrate } from './schema';
import { getTask, getTaskBySlug, setStatus } from './tasks';
import type { TaskqDb } from './types';

let db: TaskqDb;

function fresh(): TaskqDb {
  const d = new Database(':memory:') as unknown as TaskqDb;
  d.exec('PRAGMA foreign_keys = ON');
  migrate(d);
  return d;
}

beforeEach(() => {
  db = fresh();
});

const base = {
  app: 'ca',
  method: 'GET',
  url: '/api/notes/42',
  status: 500,
  name: 'TypeError',
  message: "cannot read 'title' of undefined",
  stack: 'TypeError: cannot read...\n  at handler (notes.ts:10)',
  correlationId: 'cid-1',
  user: 'someone@example.com',
};

describe('redactPayload', () => {
  test('masks secret-looking keys, keeps the rest', () => {
    const out = redactPayload({ email: 'a@b.com', password: 'hunter2', nested: { apiKey: 'sk-123', ok: 1 } }) as any;
    expect(out.email).toBe('a@b.com');
    expect(out.password).toBe('***redacted***');
    expect(out.nested.apiKey).toBe('***redacted***');
    expect(out.nested.ok).toBe(1);
  });

  test('truncates very long strings and bounds arrays', () => {
    const out = redactPayload({ big: 'x'.repeat(2000), arr: Array.from({ length: 100 }, (_, i) => i) }) as any;
    expect(out.big).toContain('…(2000 chars)');
    expect(out.arr.length).toBe(50);
  });
});

describe('captureServerError', () => {
  test('a new 500 creates one ready task with the rendered detail', () => {
    const r = captureServerError(db, { ...base, at: '2026-06-24T00:00:00.000Z' });
    expect(r.created).toBe(true);
    expect(r.count).toBe(1);
    expect(r.slug).toBe(captureSlug('ca', r.signature));

    const task = getTask(db, r.taskId)!;
    expect(task.status).toBe('ready');
    expect(task.repo).toBe('ca');
    expect(task.title).toContain('[500] GET /api/notes/:id');
    expect(task.body).toContain('TypeError');
    expect(task.body).toContain('cid-1');
    expect(task.body).toContain('someone@example.com');
    // the auto-tier marker, NOT a hard-coded model (so it gets classified)
    expect(task.model).toBeTruthy();
  });

  test('the same signature dedupes — bump count + last-seen, no second task', () => {
    captureServerError(db, { ...base, url: '/api/notes/1', at: '2026-06-24T00:00:00.000Z' });
    const r2 = captureServerError(db, {
      ...base,
      url: '/api/notes/2',
      correlationId: 'cid-2',
      at: '2026-06-24T01:00:00.000Z',
    });

    expect(r2.created).toBe(false);
    expect(r2.count).toBe(2);
    expect(db.query('SELECT COUNT(*) AS n FROM tasks').get()).toEqual({ n: 1 });

    const task = getTaskBySlug(db, r2.slug)!;
    expect(task.body).toContain('Occurrences:** 2');
    expect(task.body).toContain('first seen 2026-06-24T00:00:00.000Z');
    expect(task.body).toContain('last seen 2026-06-24T01:00:00.000Z');
    expect(task.body).toContain('cid-2');
  });

  test('a different signature files a separate task', () => {
    captureServerError(db, base);
    captureServerError(db, { ...base, url: '/api/contacts/1', message: 'different bug' });
    expect(db.query('SELECT COUNT(*) AS n FROM tasks').get()).toEqual({ n: 2 });
  });

  test('a recurrence after the task was done re-queues it (regression)', () => {
    const r1 = captureServerError(db, base);
    setStatus(db, r1.taskId, 'done');
    const r2 = captureServerError(db, base);

    expect(r2.created).toBe(false);
    expect(r2.reopened).toBe(true);
    expect(r2.count).toBe(2);
    const task = getTask(db, r1.taskId)!;
    expect(task.status).toBe('ready');
    expect(task.hold_disposition).toBeNull(); // un-parking clears any disposition
    expect(task.body).toContain('regression');
  });

  test('apps are namespaced — the same error in ca and ru are distinct tasks', () => {
    captureServerError(db, base);
    captureServerError(db, { ...base, app: 'ru' });
    expect(db.query('SELECT COUNT(*) AS n FROM tasks').get()).toEqual({ n: 2 });
  });

  test('payload is redacted in the persisted body', () => {
    const r = captureServerError(db, { ...base, payload: { note: 'hi', password: 'hunter2' } });
    const task = getTask(db, r.taskId)!;
    expect(task.body).toContain('***redacted***');
    expect(task.body).not.toContain('hunter2');
  });
});
