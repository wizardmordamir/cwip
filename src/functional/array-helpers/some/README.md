# some Function

A function similar to the Array.some method. This is a partially applied function,
the first set of arguments being a "some" function 
The second set of arguments is the array. 

This function allows for the use of some in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const some = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) => array.some(fn));
```

---

## How to Use it

```typescript
const arr = [30, 4, 305, 100];
const someFn = (a, b) => a === 30;

pipe(
  some(someFn),
  loggit('result'), // result true
)(arr);
```