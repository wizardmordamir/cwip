# includes Function

A function similar to the Array.includes method. This is a partially applied function,
the first argument being the value you want to compare
The second argument is the array to compare to

This function allows for the use of includes in functional composition when using functions such as [pipe](../../util-functions/pipe/README.md).

---

## The Code

```typescript
export const includes = curry(<V>(value: V, array: V[]) => array.includes(value));
```

---

## How to Use it

```typescript
pipe(
  includes(1),
  loggit('result'), // result true
)([1,2,3,4]);
pipe(
  includes(10),
  loggit('result'), // result false
)([1,2,3,4]);
```

```typescript
const object1 = {};
const object2 = {};
const object3 = {};
const array = [object1, object1, object2];
pipe(
  includes(object1),
  loggit('result'), // result true
)(array);
pipe(
  includes(object2),
  loggit('result'), // result true
)(array);
pipe(
  includes(object3),
  loggit('result'), // result false
)(array);
```