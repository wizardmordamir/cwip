import { curry } from '../../util-functions/curry';
import { IdentityInterface, MonadInterface } from '../../interfaces';
import ShortCircuit from '../short-circuit';

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
  switch (x.constructor) {
    case EitherLeft:
      return left(x.join());
    case EitherRight:
      return right(x.join());
    default:
      return ShortCircuit(x);
  }
});

export default { Either, EitherLeft, EitherRight };
