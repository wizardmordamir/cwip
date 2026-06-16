import { describe, expect, it } from 'bun:test';
import { orderBy } from './orderBy';

describe('orderBy', () => {
  it('should sort an array of objects by a property in ascending order', () => {
    const arr = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 },
      { name: 'Jay', age: 30 },
    ];
    const result = orderBy(arr, 'age', 'asc');
    expect(result).toEqual([
      { name: 'Jane', age: 25 },
      { name: 'John', age: 30 },
      { name: 'Jay', age: 30 },
      { name: 'Bob', age: 35 },
    ]);
  });

  it('should sort an array of objects by a property in descending order', () => {
    const arr = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
      { name: 'Bob', age: 35 },
    ];
    const result = orderBy(arr, 'age', 'desc');
    expect(result).toEqual([
      { name: 'Bob', age: 35 },
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ]);
  });

  it('should sort by nested property', () => {
    const arr = [
      { user: { details: { age: 30 } } },
      { user: { details: { age: 25 } } },
      { user: { details: { age: 35 } } },
    ];
    const result = orderBy(arr, 'user.details.age', 'asc');
    expect(result).toEqual([
      { user: { details: { age: 25 } } },
      { user: { details: { age: 30 } } },
      { user: { details: { age: 35 } } },
    ]);
  });

  it('should handle undefined or null values', () => {
    const arr = [{ name: 'John', age: 30 }, { name: 'Jane' }, { name: 'Bob', age: null }, { name: 'Alice', age: 25 }];
    const result = orderBy(arr, 'age', 'desc');
    expect(result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: null },
      { name: 'Jane' },
    ]);
  });

  it('should handle undefined or null values ascending', () => {
    const arr = [{ name: 'John', age: 30 }, { name: 'Jane' }, { name: 'Bob', age: null }, { name: 'Alice', age: 25 }];
    const result = orderBy(arr, 'age', 'asc');
    expect(result).toEqual([
      { name: 'Jane' },
      { name: 'Bob', age: null },
      { name: 'Alice', age: 25 },
      { name: 'John', age: 30 },
    ]);
  });

  it('should use ascending order by default', () => {
    const arr = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];
    const result = orderBy(arr, 'age');
    expect(result).toEqual([
      { name: 'Jane', age: 25 },
      { name: 'John', age: 30 },
    ]);
  });
});
