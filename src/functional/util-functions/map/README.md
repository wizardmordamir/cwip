# Map Function

A Function that can be used within a Pipe or Compose to execute the Map method on a monad.

__Important only use this function when dealing with Monads__

---

## The Code

```typescript
export const map = (fn: Function) => (x) => {
  return x.map(fn);
};
```

---

## How to Use it

```typescript
import { pipe } from '../pipe';
import { Identity } from '../../monads';
import { map } from '.';

const add1 = (x) => x + 1;
const pipedFunction = pipe(
  Identity,
  map(add1) // the chain method in use
);

const result = pipedFunction(3);
console.log(result.join()); // 4
```
