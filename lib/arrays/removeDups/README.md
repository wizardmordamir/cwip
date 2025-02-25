# removeDups Function

A function to remove duplicates of values from an array

---

## The Code

```typescript
export const removeDups = <T>(arr: T[]): T[] => [...new Set(arr)];
```

---

## How to Use it

```typescript
removeDups([1, 2, 3, 3, 2, 1, 5]); // [1, 2, 3, 5]
removeDups([{ a: 1 }, { a: 1 }]); // [{ a: 1 }]
removeDups([1, { a: 1 }, { a: 1 }, 2, 1]); // [1, { a: 1 }, 2]
removeDups([]); // []
```
