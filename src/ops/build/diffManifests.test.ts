import { describe, expect, it } from 'bun:test';
import { diffManifests } from '.';

describe('diffManifests', () => {
  it('reports added, removed, and changed keys', () => {
    const prev = { a: '1', b: '2', c: '3' };
    const next = { a: '1', b: 'CHANGED', d: '4' };
    expect(diffManifests(prev, next)).toEqual({
      added: ['d'],
      removed: ['c'],
      changed: ['b'],
    });
  });

  it('returns all-empty lists when manifests are identical', () => {
    const m = { a: '1', b: '2' };
    expect(diffManifests(m, { ...m })).toEqual({ added: [], removed: [], changed: [] });
  });
});
