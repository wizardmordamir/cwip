# Pipe Function

A Function that can be used to combine a set of functions to apply to a value

__Important: Pipe runs the functions from first to last based on the parameters provided__

---

## The Code

```typescript
export const pipe = (...fns) =>
  (...args) => fns.reduce((res, fn) => [fn.call(null, ...res)], args)[0];

```

---

## How to Use it

```typescript
import { pipe } from '.';

const add1 = (x) => x + 1;
const multiply2 = (x) => x * 2;

const piped = pipe(
  multiply2,
  add1
);

const result = piped(1);
console.log(result); // 3
```
