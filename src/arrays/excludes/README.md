# excludes Function

A function to check which values are excluded from an array of primitives or excluded from an array of objects by key.

---

## The Code

```typescript
export const excludes = <T, V>(
  arr: T[],
  vals: V[],
  deepKey?: string,
  separator: string = '.',
): V[] => {
  const arrSet = deepKey
    ? new Set(arr.map((a) => getDeepKey(a, deepKey, separator)))
    : new Set(arr);
  return vals.filter((val) => !arrSet.has(deepKey ? val : (val as unknown as T)));
};
```

---

## How to Use it

```typescript
  excludes([1, 2, 3], [1, 3, 4]); // [4]
  excludes([{ a: 1} , { a: 2 }, { a: 3 }], [1, 3, 4], 'a'); // [4]
  exludes([{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }], [1, 3, 4], 'a.b'); // 4
  exludes([{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }], [1, 3, 4], 'a/b', '/'); // 4
  exludes([1, 2, 3], [1, 3, 4], 'a'); // [1, 3, 4]
  exludes([1, 2, 3], [1, 3, 4], 'a.b'); // [1, 3, 4]
```
