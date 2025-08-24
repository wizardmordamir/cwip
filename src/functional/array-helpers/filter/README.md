# filter Function

A function similar to the Array.filter method. This is a partially applied function,
the first set of arguments being a "filter" function 
The second set of arguments is the array. 

This function allows for the use of filter in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const filter = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) => array.filter(fn));
```

---

## How to Use it

```typescript
const arr = [30, 4, 305, 100];
const filterFn = (a, b) => a < 100;

pipe(
  filter(filterFn),
  loggit('result'), // result [30, 4]
)(arr);
```