# Join Function

A Function that can be used within a Pipe or Compose Function to execute the Join method on a monad.

__Important only use this function when dealing with Monads__

---

## The Code

```typescript
export const join = (x: MonadInterface<any>) => {
  return x.join();
}
```

---

## How to Use it

```typescript
import { pipe } from '../pipe';
import { Identity } from '../../monads';
import { join } from '.';

const pipedFunction = pipe(
  Identity,
  join // the join method in use
);

const result = pipedFunction(3);
console.log(result); // 3
```
