# Error Monad

A Monadic Funciton that can be used to handle Errors or Successes

---

## The Code

```typescript
export const ErrorMonad = curry(
  (evaluator: Function, success: Function, errorMessage: string, x: MonadInterface<any>): IdentityInterface<any> => {
    return evaluator(x) ? Identity(success(x)) : ShortCircuit(new Error(errorMessage));
  }
);
```

---

## How to Use it

```typescript
import { ErrorMonad } from '.';
import { pipe } from '../util-functions';

const is3 = (x): boolean => x === 3;
const isNumber = (x): boolean => typeof x === 'number';
const multiplyBy11 = (x) => x * 11;
const add2 = (x) => x + 2;
const not3Error = `The value is not 3`;
const notNumberError = `The value is not a number`;
const chainAdd2 = (x) => x.chain(add2);

const ErrorPipe = pipe(
  ErrorMonad(is3, multiplyBy11, not3Error),
  chainAdd2
);

const Piped = ErrorPipe(3);

const Error1 = ErrorMonad(is3, multiplyBy11, not3Error, 3)
  .join();

const Error2 = ErrorMonad(is3, multiplyBy11, not3Error, 3)
  .chain(ErrorMonad(isNumber, multiplyBy11, notNumberError))
  .join();

const ErrorFail = ErrorMonad(is3, multiplyBy11, not3Error, 4)
  .join();

console.log(Piped); // 35
console.log(Error1); // 33
console.log(Error2); // 363
console.log(ErrorFail); // Error Object
```
