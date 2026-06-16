import { describe, expect, it } from 'bun:test';
import { type CaptureRecord, captureCall, toCapturedError } from '.';

const fixedClock = () => {
  let t = 0;
  return () => (t += 5); // each read advances 5ms
};

describe('captureCall', () => {
  it('records request + response + timing and returns the result', async () => {
    const records: CaptureRecord[] = [];
    const result = await captureCall(() => Promise.resolve({ rows: [1, 2] }), {
      label: 'list',
      kind: 'db',
      request: { sql: 'SELECT 1' },
      sink: (r) => {
        records.push(r);
      },
      clock: fixedClock(),
      now: () => '2026-01-01T00:00:00.000Z',
    });
    expect(result).toEqual({ rows: [1, 2] });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      label: 'list',
      kind: 'db',
      request: { sql: 'SELECT 1' },
      response: { rows: [1, 2] },
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(records[0].durationMs).toBeGreaterThan(0);
    expect(records[0].error).toBeUndefined();
  });

  it('captures and re-throws errors by default', async () => {
    const records: CaptureRecord[] = [];
    const boom = new Error('kaboom');
    const promise = captureCall(() => Promise.reject(boom), {
      label: 'x',
      request: {},
      sink: (r) => records.push(r) as unknown as undefined,
    });
    await expect(promise).rejects.toThrow('kaboom');
    expect(records[0].error?.message).toBe('kaboom');
    expect(records[0].response).toBeUndefined();
  });

  it('swallows the error and returns undefined when rethrow:false', async () => {
    const records: CaptureRecord[] = [];
    const out = await captureCall(() => Promise.reject(new Error('nope')), {
      label: 'x',
      request: {},
      rethrow: false,
      sink: (r) => records.push(r) as unknown as undefined,
    });
    expect(out).toBeUndefined();
    expect(records[0].error?.name).toBe('Error');
  });

  it('toResponse maps the stored response shape', async () => {
    const records: CaptureRecord[] = [];
    await captureCall(() => Promise.resolve(42), {
      label: 'x',
      request: {},
      toResponse: (n) => ({ doubled: n * 2 }),
      sink: (r) => records.push(r) as unknown as undefined,
    });
    expect(records[0].response).toEqual({ doubled: 84 });
  });
});

describe('toCapturedError', () => {
  it('serializes Error name/message/stack plus own fields', () => {
    const err = Object.assign(new Error('bad'), { status: 500 });
    const out = toCapturedError(err);
    expect(out).toMatchObject({ name: 'Error', message: 'bad', status: 500 });
    expect(out.stack).toBeDefined();
  });

  it('handles non-Error throws', () => {
    expect(toCapturedError('oops')).toMatchObject({ name: 'NonError', message: 'oops' });
  });
});
