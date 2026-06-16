# excludes Function

A function to get the value from a deeply nested key from an object with a separator.

---

## The Code

```typescript
export const path = (obj: any, deepKey: string, separator: string = '.'): any =>
  deepKey.split(separator).reduce((accum, key) => accum && accum[key], obj);
```

---

## How to Use it

```typescript
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c'); // 1
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.e'); // 3
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c.d'); // undefined
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c.d.e.f'); // undefined
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/b/c', '/'); // 1
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/e', '/'); // 3
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/b/c/d'); // undefined
  path({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/b/c/d/e/f'); // undefined
```
