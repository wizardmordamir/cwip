# flat Function

A function similar to the Array.flat method. This is a partially applied function,
the first argument being the depth (defaults to 1)
The second argument being the array. 

This function allows for the use of flat in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const flat = (d = 1) => (array) => {
  const recurrsiveCheck = ifIt(Array.isArray, flat(d - 1));
  return d > 0
    ? array.reduce((acc, value) => acc.concat(recurrsiveCheck(value)), [])
    : array.slice();
};
```

---

## How to Use it

```typescript
pipe(
  flat(1),
  loggit('result'), // result [1,2,3,4,5,6,7,8]
)([[1,2,3,4],5,6,7,8]);

pipe(
  flat(1),
  loggit('result'), // result [1,2,[3,4],5,6,7,8]
)([[1,2,[3,4]],5,6,7,8]);

pipe(
  flat(2),
  loggit('result'), // result [1,2,3,4,5,6,7,8]
)([[1,2,[3,4]],5,6,7,8]);
```