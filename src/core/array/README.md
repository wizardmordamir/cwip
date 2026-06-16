# sort Function

A function similar to the Array.sort method. This is a partially applied function,
the first set of arguments being a "sort" function (will default to native array sorting if not provided ie .sort()). 
The second set of arguments is the array. 

This function allows for the use of sort in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const sort = <I, R extends number>(sortFn?: (a: I, b: I) => R) => (array: I[]) => array.sort(sortFn);
```

---

## How to Use it

```typescript
const arr = [30, 4, 305, 100];
const sortFn = (a, b) => a - b;

pipe(
  sort(sortFn),
  loggit('result'), // result [4, 30, 100, 305]
)(arr);
```
```typescript
const arr = ['d', 'a', 'c', 'b'];
const sortFn = (a, b) => a - b;

pipe(
  sort(sortFn),
  loggit('result'), // result ['a', 'b', 'c' ,'d' ]
)(arr);
```