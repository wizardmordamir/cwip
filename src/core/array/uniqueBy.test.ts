import { describe, expect, it } from 'bun:test';
import { uniqueBy } from '.'; // Adjust path accordingly

describe('uniqueBy', () => {
  const users = [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Charlie', role: 'admin' },
    { id: 4, name: 'Alice', role: 'guest' },
  ];

  it('should filter duplicates based on a shallow key', () => {
    // Keeps the first occurrence of 'Alice'
    const result = uniqueBy('name', users);

    expect(result).toHaveLength(3);
    expect(result.map((u) => u.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should filter duplicates based on a deep key', () => {
    const nestedData = [
      { id: 1, meta: { code: 'A' } },
      { id: 2, meta: { code: 'B' } },
      { id: 3, meta: { code: 'A' } },
    ];

    const result = uniqueBy('meta.code', nestedData);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('should work as a "Lego" piece via partial application', () => {
    // Configure the helper first (Config-First)
    const uniqueById = uniqueBy('id');

    const data = [{ id: 1 }, { id: 1 }, { id: 2 }];

    // Provide data later (Data-Last)
    expect(uniqueById(data)).toHaveLength(2);
  });

  it('should return an empty array when given an empty array', () => {
    expect(uniqueBy('any', [])).toEqual([]);
  });

  it('should handle cases where the deepKey does not exist', () => {
    const data = [{ a: 1 }, { b: 2 }, { c: 3 }];
    // If key is missing, path returns undefined.
    // All items look the same (undefined), so only the first is kept.
    const result = uniqueBy('missing.path', data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ a: 1 });
  });

  it('should treat different types as unique (e.g., "1" vs 1)', () => {
    const data = [{ val: 1 }, { val: '1' }, { val: 1 }];
    const result = uniqueBy('val', data);

    expect(result).toHaveLength(2);
    expect(result[0].val).toBe(1);
    expect(result[1].val).toBe('1');
  });
});
