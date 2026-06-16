import { describe, expect, it } from 'bun:test';
import { defineFixture, resetSeqIds, seqId, sequence } from './fixture';

describe('defineFixture', () => {
  it('builds from static defaults and applies overrides', () => {
    const aUser = defineFixture({ name: 'Test', roles: ['user'] as string[] });
    expect(aUser()).toEqual({ name: 'Test', roles: ['user'] });
    expect(aUser({ name: 'Alice' })).toEqual({ name: 'Alice', roles: ['user'] });
  });

  it('deep-clones object defaults so builds never share nested state', () => {
    const aThing = defineFixture({ tags: [] as string[] });
    const a = aThing();
    a.tags.push('x');
    expect(aThing().tags).toEqual([]); // not polluted by `a`
  });

  it('re-invokes a factory default for fresh values each build', () => {
    const aRow = defineFixture(() => ({ id: seqId('row'), v: 1 }));
    expect(aRow().id).not.toBe(aRow().id);
  });
});

describe('sequence + seqId', () => {
  it('sequence increments from start', () => {
    const next = sequence(10);
    expect([next(), next(), next()]).toEqual([10, 11, 12]);
  });

  it('seqId yields unique, prefixed, readable ids and resets', () => {
    resetSeqIds();
    expect(seqId('user')).toBe('user-1');
    expect(seqId('user')).toBe('user-2');
    expect(seqId('list')).toBe('list-1');
    resetSeqIds();
    expect(seqId('user')).toBe('user-1');
  });
});
