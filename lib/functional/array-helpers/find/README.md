# find Function

A function similar to the Array.find method. This is a partially applied function,
the first set of arguments being a "find" function 
The second set of arguments is the array. 

This function allows for the use of find in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const find = curry(<A>(fn: (v: A, index?: number, array?: A[]) => any, array: A[]) => array.find(fn));
```

---

## How to Use it

```typescript
const arr = [{id: 1, isEnabled: false}, {id: 2, isEnabled: true}];
const findFn = ({isEnabled}) => isEnabled;

pipe(
  find(findFn),
  loggit('result'), // result {id: 2, isEnabled: true}
)(arr);
```