import { describe, expect, it } from 'bun:test';
import { filterA } from './filterA';

describe('filterAsync', () => {
  it('should filter an array', async () => {
    const result = await filterA((x: number) => x > 5)([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).toEqual([6, 7, 8, 9, 10]);
  });

  it('should filter an array with async predicate', async () => {
    const result = await filterA(async (x: number) => x > 5)([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).toEqual([6, 7, 8, 9, 10]);
  });
});
