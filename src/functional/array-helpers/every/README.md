# every Function

A function similar to the Array.every method. This is a partially applied function,
the first set of arguments being a "every" function 
The second set of arguments is the array. 

This function allows for the use of every in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const every = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) => array.every(fn));
```

---

## How to Use it

```typescript
const arr = [30, 4, 305, 100];
const everyFn = (a, b) => a < 100;

pipe(
  every(everyFn),
  loggit('result'), // result false
)(arr);
```
```typescript
const arr = [30, 4, 305, 100];
const everyFn = (a, b) => a < 500;

pipe(
  every(everyFn),
  loggit('result'), // result true
)(arr);
```