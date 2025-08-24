# Either Monad

A Monadic Function that can be used to allow for multiple path resolution.

---

## The Code

```typescript
export class EitherLeft implements IdentityInterface<any> {
  private readonly value;

  constructor(value) {
    this.value = value;
  }

  static of(x): IdentityInterface<any> {
    return new EitherLeft(x);
  }

  map(fn: Function): IdentityInterface<any> {
    return EitherLeft.of(fn(this.value));
  }

  join(): any {
    return this.value;
  }

  chain(fn: Function): any {
    return this.map(fn).join();
  }
}

export class EitherRight implements IdentityInterface<any> {
  private readonly value;

  constructor(value) {
    this.value = value;
  }

  static of(x): IdentityInterface<any> {
    return new EitherRight(x);
  }

  map(fn: Function): IdentityInterface<any> {
    return EitherRight.of(fn(this.value));
  }

  join(): any {
    return this.value;
  }

  chain(fn: Function): any {
    return this.map(fn).join();
  }
}

export const Either = curry((left, right, x: EitherLeft | EitherRight): MonadInterface<any> => {
  switch(x.constructor) {
    case EitherLeft:
      return left(x.join());
    case EitherRight:
      return right(x.join());
    default:
      return ShortCircuit(x);
  }
});

export default {
  Either,
  EitherLeft,
  EitherRight
};
```

---

## How to Use it

```typescript
import { Identity, ShortCircuit } from '../';
import { Either, EitherLeft, EitherRight } from '.';

const evaluation = (x) => {
  return typeof x === 'number' ?
    EitherLeft.of(x) :
    EitherRight.of(x);
};

const add1 = Either(Identity, ShortCircuit, evaluation(3))
  .chain((x) => x + 1);

const add1Fail = Either(Identity, ShortCircuit, evaluation('nope'))
  .chain((x) => x + 1);

console.log(add1); // 4
console.log(add1Fail); // nope
```
