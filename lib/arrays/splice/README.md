# splice Function

A function to splice an array that returns the mutated array.

---

## The Code

```typescript
export const splice = <T>(arr: T[], start: number, deleteCount: number = 1, ...items: T[]): T[] => {
  arr.splice(start, deleteCount, ...items);
  return arr;
};
```

---

## How to Use it

```typescript
  // includes([1, 2, 3], [1, 3, 4]); // [1, 3]

```
