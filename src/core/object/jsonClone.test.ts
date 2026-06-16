import { describe, expect, it } from 'bun:test';
import { jsonClone } from '.';

describe('jsonClone', () => {
  it('deep-clones plain data', () => {
    const src = { a: 1, b: { c: [1, 2, { d: 'x' }] } };
    const out = jsonClone(src);
    expect(out).toEqual(src);
    expect(out.b).not.toBe(src.b);
  });

  it('snapshots getter-backed objects (where structuredClone throws)', () => {
    const proxy = new Proxy({ a: 1 }, {});
    expect(() => structuredClone(proxy)).toThrow();
    expect(jsonClone(proxy)).toEqual({ a: 1 });
  });

  it('drops functions/undefined and stringifies dates (lossy by design)', () => {
    const out = jsonClone({ f: () => 1, u: undefined, d: new Date('2026-01-01T00:00:00Z') } as any);
    expect(out).toEqual({ d: '2026-01-01T00:00:00.000Z' });
  });

  it('passes falsy values through', () => {
    expect(jsonClone(null)).toBeNull();
    expect(jsonClone('')).toBe('');
    expect(jsonClone(0)).toBe(0);
  });
});
