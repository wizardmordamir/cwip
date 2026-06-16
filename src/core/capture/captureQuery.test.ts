import { describe, expect, it } from 'bun:test';
import { type CaptureRecord, captureQuery, createMemoryCaptureSink } from '.';

describe('captureQuery', () => {
  it('captures sql + params + result and returns the rows', async () => {
    const cap = createMemoryCaptureSink();
    const rows = await captureQuery(() => Promise.resolve([{ id: 1 }, { id: 2 }]), {
      label: 'list-users',
      sql: 'SELECT * FROM users WHERE org = $1',
      params: ['acme'],
      sink: cap.sink,
    });
    expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    const rec = cap.records()[0];
    expect(rec.kind).toBe('db');
    expect(rec.request).toEqual({ sql: 'SELECT * FROM users WHERE org = $1', params: ['acme'] });
    expect(rec.response).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('captures and re-throws query errors', async () => {
    const cap = createMemoryCaptureSink();
    const promise = captureQuery(() => Promise.reject(new Error('deadlock')), {
      label: 'q',
      sql: 'UPDATE x',
      sink: cap.sink,
    });
    await expect(promise).rejects.toThrow('deadlock');
    expect(cap.records()[0].error?.message).toBe('deadlock');
  });
});

describe('createMemoryCaptureSink', () => {
  it('collects records and filters by label', async () => {
    const cap = createMemoryCaptureSink();
    await captureQuery(() => Promise.resolve(1), { label: 'a', sql: 's', sink: cap.sink });
    await captureQuery(() => Promise.resolve(2), { label: 'b', sql: 's', sink: cap.sink });
    expect(cap.records()).toHaveLength(2);
    expect(cap.byLabel('a')).toHaveLength(1);
  });

  it('honors a max as a ring buffer', () => {
    const cap = createMemoryCaptureSink({ max: 2 });
    const rec = (n: number): CaptureRecord => ({ label: 'x', timestamp: 't', durationMs: 0, request: n });
    cap.sink(rec(1));
    cap.sink(rec(2));
    cap.sink(rec(3));
    expect(cap.records().map((r) => r.request)).toEqual([2, 3]);
  });

  it('clear empties the buffer', () => {
    const cap = createMemoryCaptureSink();
    cap.sink({ label: 'x', timestamp: 't', durationMs: 0, request: 1 });
    cap.clear();
    expect(cap.records()).toHaveLength(0);
  });
});
