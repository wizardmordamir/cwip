# Compose Function

A Function that can be used to combine a set of functions to apply to a value

__Important: Compose runs the functions from last to first based on the parameters provided__

---

## The Code

```typescript
export const compose = (...fns) =>
  (...args) => fns.reduceRight((res, fn) => [fn.call(null, ...res)], args)[0];
```

---

## How to Use it

```typescript
import { compose } from '.';

const add1 = (x) => x + 1;
const multiply2 = (x) => x * 2;

const composed = compose(
  add1,
  multiply2
);

const result = composed(1);
console.log(result); // 3
```
