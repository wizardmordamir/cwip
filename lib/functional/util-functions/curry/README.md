# Curry Function

A Function that allows you to partially apply parameters to the provided function.

Will fully type non-generic/stongly typed functions 

Generic functions with generic return types will result in the return being typed as 'any' at this time


---

å## The Code

```typescript
import { Curry } from '../../typescriptUtils';

const inner = (fn) => (...args) => (
  args.length >= fn.length
    ? fn(...args)
    : (...more) => curry(fn)(...args, ...more)
);

export const curry = <P extends any[], R>(fn: (...args: P) => R): Curry<P, R> => inner(fn);
```

---

## How to Use It

```typescript
import { curry } from '.'

const myFunction = (x, y, z) => {
  console.log(`The parameters are: ${x}, ${y}, ${z}`);
};

const curried = curry(myFunction);

const partialApplied = curried(1, 2);

const result = partialApplied(3);
console.log(result); // 'The parameters are: 1, 2, 3
```
