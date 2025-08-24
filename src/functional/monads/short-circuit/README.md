# Short Circuit Monad

A Monadic Function that allows you to stop processing any futher Monad Methods, and returns back the current value.

---

## The Code

```typescript
export const ShortCircuit = (x): IdentityInterface<any> => ({
  map: (fn): IdentityInterface<any> => ShortCircuit(x),
  join: (): string => x,
  chain: (fn): string => ShortCircuit(x).join()
});
```

---

## How to Use it

```typescript
import { ShortCircuit } from '.';
import Identity from '../identity';

const result = ShortCircuit(3)
  .map(x => x + 1) // will not apply function
  .join();

const idOrShort = (x) =>
  typeof x === 'number' ?
    Identity(x) : ShortCircuit(x);

const result2 = Identity(3)
  .chain(idOrShort)
  .chain(x => x + 1);

const result3 = Identity('apple')
  .chain(idOrShort)
  .chain(x => x + 1);

console.log(result); // 3
console.log(result2); // 4
console.log(result3); // apple
```
