# excludes Function

A function to check which values are included in an array of primitives or included in an array of objects by key.

---

## The Code

```typescript
export const includesDeep = <T, V>(
  arr: T[],
  vals: V[],
  deepKey?: string,
  separator: string = '.',
): V[] => {
  const set = new Set(arr.map((a) => (deepKey ? getDeepKey(a, deepKey, separator) : a)));
  return vals.filter((val) => set.has(deepKey ? val : (val as unknown as T)));
};
```

---

## How to Use it

```typescript
  includes([1, 2, 3], [1, 3, 4]); // [1, 3]
  includes([{ a: 1} , { a: 2 }, { a: 3 }], [1, 3, 4], 'a'); // [1, 3]
  includes([{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }], [1, 3, 4], 'a.b'); // [1, 3]
  includes([{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }], [1, 3, 4], 'a/b', '/'); // [1, 3]
  includes([1, 2, 3], [1, 3, 4], 'a'); // []
  includes([1, 2, 3], [1, 3, 4], 'a.b'); // []
```
