# Identity Monad

A Monadic Function that allows you to functions declarativly on a value

---

## The Code

```typescript
export const Identity = (x): IdentityInterface<any> => ({
  map: (fn): IdentityInterface<any> => Identity(fn(x)),
  join: (): string => x,
  chain: (fn): string => Identity(x).map(fn).join()
});
```

---

## How to Use it

```typescript
import { Identity } from '.';

const add1 = (x) => x + 1;
const multiply2 = (x) => x * 2;

const result = Identity(1)
  .map(multiply2)
  .chain(add1);
console.log(result); // 3
```
