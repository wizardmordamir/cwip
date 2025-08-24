# removeDupsPrimitive Function

A function to remove duplicates of primitive values from an array

---

## The Code

```typescript
export const removeDupsPrimitive = <T>(arr: T[]): T[] => [...new Set(arr)];
```

---

## How to Use it

```typescript
removeDupsPrimitive([1, 2, 3, 3, 2, 1, 5]); // [1, 2, 3, 5]
removeDupsPrimitive([{ a: 1 }, { a: 1 }]); // [{ a: 1 }, { a: 1 }]
removeDupsPrimitive([]); // []
```
