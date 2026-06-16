import { describe, expect, it } from 'bun:test';
import { mapA } from './mapA';

describe('mapA', () => {
  it('should map an array', async () => {
    const result = await mapA((x: number) => x * 2)([1, 2, 3, 4, 5]);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });
});
