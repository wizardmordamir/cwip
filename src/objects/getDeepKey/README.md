# excludes Function

A function to get the value from a deeply nested key from an object with a separator.

---

## The Code

```typescript
export const getDeepKey = (obj: any, deepKey: string, separator: string = '.'): any =>
  deepKey.split(separator).reduce((accum, key) => accum && accum[key], obj);
```

---

## How to Use it

```typescript
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c'); // 1
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.e'); // 3
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c.d'); // undefined
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a.b.c.d.e.f'); // undefined
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/b/c', '/'); // 1
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/e', '/'); // 3
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/b/c/d'); // undefined
  getDeepKey({ a: { b: { c: 1, d: 2 }, e: 3 } }, 'a/b/c/d/e/f'); // undefined
```
