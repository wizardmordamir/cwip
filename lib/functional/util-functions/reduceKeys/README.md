# ReduceKeys Function

A Function that will return a new object with only the specified keys.

---

## The Code

```typescript
type ReduceKeys = <T>(obj: T, keys: ArrayOfObjectKeys<T>) => PartOfObject<T>;

export const reduceKeys: ReduceKeys = (obj, keys) =>
  keys.reduce((accum, curr) => ({
    ...accum,
    [curr]: obj[curr]
  }), {});
```

---

## How to Use it

```typescript
const obj = {
  a: 1,
  b: 2,
  c: 3,
};

reduceKeys(obj, ['a', 'b']); // { a: 1, b: 2 }
```
