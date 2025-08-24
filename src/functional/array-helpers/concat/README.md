# concat Function

A function similar to the Array.concat method. This is a partially applied function,
the first set of arguments being a "concat" function 
The second set of arguments is the array. 

This function allows for the use of concat in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const concat = (child) => (parent) => parent.concat(child);
```

---

## How to Use it

```typescript
pipe(
  reduce(concat, []),
  loggit('result'), // result [1,2,3,4,5,6,7,8]
)([[1,2,3,4], [5,6,7,8]]);

pipe(
  reduce(concat, []),
  loggit('result'), // result [1,2,3,4,5,6,7,8]
)([[1,2,3,4],5,6,7,8]);
```