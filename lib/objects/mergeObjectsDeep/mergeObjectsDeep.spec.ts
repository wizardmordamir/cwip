import { mergeObjectsDeep } from '.';

describe('mergeObjectsDeep', () => {
  it('should merge multiple objects deeply', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { b: { d: 3 }, e: [{ e1: 4 }] };
    const obj3 = { a: 5, f: 6 };

    const result = mergeObjectsDeep<any>(obj1, obj2, obj3);

    expect(result).toEqual({
      a: 5,
      b: {
        c: 2,
        d: 3,
      },
      e: [{ e1: 4 }],
      f: 6,
    });
  });

  it('should handle empty objects', () => {
    const obj1 = {};
    const obj2 = { a: 1 };

    const result = mergeObjectsDeep(obj1, obj2);

    expect(result).toEqual({ a: 1 });
  });

  it('should handle arrays in objects', () => {
    const obj1 = { a: [1, 2] };
    const obj2 = { a: [3, 4] };

    const result = mergeObjectsDeep(obj1, obj2);

    expect(result).toEqual({ a: [3, 4] });
  });

  it('should not mutate the original objects', () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };

    mergeObjectsDeep<any>(obj1, obj2);

    expect(obj1).toEqual({ a: 1 });
    expect(obj2).toEqual({ b: 2 });
  });
});
