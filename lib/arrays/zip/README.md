# zip Function

A function to combine values from arrays at the same indexes

---

## The Code

```typescript
export const zip = <T>(...arr: T[][]): T[][] =>
  [...Array(Math.min(...arr.map((a) => a.length)))].map((_, i) => arr.map((a) => a[i]));
```

---

## How to Use it

```typescript
  zip(...[
    [1, 2],
    [1, 2, 3, 4],
    [1, 2, 3],
  ]);
  /*
  [
    [1, 1, 1],
    [2, 2, 2],
  ]
  */
```
