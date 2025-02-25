# Maybe Monad

A Monadic Function that can be used to apply functions or nothing in case of null pointers

---

## The Code

```javascript
export const Maybe = curry((onFail, checker, x): MaybeInterface<any> => ({
  passesChecker: (): boolean => checker(x),
  map: (fn): MaybeInterface<any> => Maybe(onFail, checker,x).passesChecker() ? Maybe(onFail, checker,fn(x)) : Maybe(onFail, checker,x),
  join: () => Maybe(onFail, checker,x).passesChecker() ? x : onFail(x),
  chain: (fn) => Maybe(onFail, checker,x).map(fn).join()
}));
```

---

## How to Use it

```typescript
import { Maybe } from '.';

const onFail = (v) => `I failed with value: ${v}`
const add1 = (x) => x + 1;

const result = Maybe(onFail, Boolean, 1)
  .map(add1)
  .join();

const result2 = Maybe(onFail, Boolean, null)
  .map(add1)
  .join();

const customChecker = (v) => Boolean(v) && v !== ''
const maybeDefaultOnFail = Maybe(onFail)
const result3 = maybeDefaultOnFail(customChecker, '')
  .map(add1)
  .join();

console.log(result); // 2
console.log(result2); // 'I failed with value: null'
console.log(result3); // '1'
```
