# Chain Function

A Function that can be used within a Pipe or Compose Function to execute the Chain method on a monad.

__Important only use this function when dealing with Monads__

---

## The Code

```typescript
const chain = (fn: Function) => (x: MonadInterface<any>) => {
  return x.chain(fn);
}
```

---

## How to Use it

```typescript
import { pipe } from '../pipe';
import { Identity } from '../../monads';
import { chain } from '.';

const add1 = (x) => x + 1;
const pipedFunction = pipe(
  Identity,
  chain(add1) // the chain method in use
);

const result = pipedFunction(3);
console.log(result); // 4
```
