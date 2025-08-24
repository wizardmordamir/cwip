# Reduce Function

A function similar to the Array.reduce method. This is a partially applied function, with the first set of arguments being a "reducer" function and the initial value. The second set of arguments is the array. This function allows for the use of reduce in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export type ReducerFnType<R, I> = (acc: R, curr: I, index?: number, arr?: I[]) => R;
export type ReduceType = <R, I>(reducerFn: ReducerFnType<R, I>, initialValue: R) => (arr: I[]) => R;

export const reduce: ReduceType = (reducerFn, initialValue) => (arr) =>
  arr.reduce(reducerFn, initialValue);
```

---

## How to Use it

```typescript
const arr = [1, 2, 3, 4, 5];
const reducerFn = (a, b) => a + b;

pipe(
  reduce(reducerFn, 0),
  loggit('result'), // result 15
)(arr);
```