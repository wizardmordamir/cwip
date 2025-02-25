# some Function

A function that returns the length of an array.

This function allows for the use of length in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const length = (array: any[] = []): number => array.length;
```

---

## How to Use it

```typescript
const arr = [30, 4, 305, 100];

pipe(
  length,
  loggit('result'), // result 4
)(arr);
```