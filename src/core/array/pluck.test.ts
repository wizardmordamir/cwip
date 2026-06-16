import { describe, expect, it } from 'bun:test';
import { pluck } from '.'; // Adjust path accordingly

describe('pluck', () => {
  const products = [
    { id: 'p1', details: { price: 100, category: 'tech' }, tags: ['new'] },
    { id: 'p2', details: { price: 200, category: 'home' }, tags: ['sale'] },
    { id: 'p3', details: { price: 150, category: 'tech' }, tags: [] },
  ];

  it('should extract a shallow property from each object', () => {
    // Config: 'id', Data: products
    const ids = pluck('id', products);
    expect(ids).toEqual(['p1', 'p2', 'p3']);
  });

  it('should extract a deeply nested property using dot notation', () => {
    // Uses path internally to reach into 'details.price'
    const prices = pluck('details.price', products);
    expect(prices).toEqual([100, 200, 150]);
  });

  it('should return undefined for missing properties in the path', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob', age: 30 }];
    // 'age' is missing for Alice
    expect(pluck('age', data)).toEqual([undefined, 30]);
  });

  it('should work as a pre-configured "Lego" piece', () => {
    // 1. Create a specialized extractor (Partial Application)
    const getCategories = pluck('details.category');

    // 2. Apply data later
    const result = getCategories(products);
    expect(result).toEqual(['tech', 'home', 'tech']);
  });

  it('should handle an empty array correctly', () => {
    expect(pluck('any.key', [])).toEqual([]);
  });

  it('should handle non-object items gracefully', () => {
    const mixed = [{ val: 1 }, null, { val: 2 }, 'not-an-object'];
    // path should handle non-objects by returning undefined
    expect(pluck('val', mixed)).toEqual([1, undefined, 2, undefined]);
  });
});
