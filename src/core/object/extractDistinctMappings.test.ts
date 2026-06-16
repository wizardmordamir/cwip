import { describe, expect, it } from 'bun:test';
import { extractDistinctMappings } from './extractDistinctMappings';

describe('extractDistinctMappings', () => {
  it('maps each value through the lookup and returns distinct results', () => {
    const map = { a: 'Apple', b: 'Banana', c: 'Cherry' };
    expect(extractDistinctMappings(['a', 'b', 'a', 'c'], map)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('preserves first-seen order of the mapped results', () => {
    const map = { x: 'one', y: 'two' };
    expect(extractDistinctMappings(['y', 'x', 'y'], map)).toEqual(['two', 'one']);
  });

  it('skips values with no entry in the map', () => {
    const map = { a: 'Apple' };
    expect(extractDistinctMappings(['a', 'missing'], map)).toEqual(['Apple']);
  });

  it('ignores empty/non-string values', () => {
    const map = { a: 'Apple', b: 'Banana' };
    expect(extractDistinctMappings(['a', '', null as any, undefined as any, 'b'], map)).toEqual(['Apple', 'Banana']);
  });

  it('returns an empty array when nothing maps', () => {
    expect(extractDistinctMappings(['z'], { a: 'Apple' })).toEqual([]);
  });
});
