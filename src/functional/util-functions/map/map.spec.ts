import { map } from '.';
import { Identity } from '../../monads/identity';
import { IdentityInterface } from '../../interfaces';

describe('Map Function', () => {
  it('should apply a function via map to a Monad', () => {
    const add1 = (x) => x + 1;
    const id = Identity(3);
    const result: IdentityInterface<number> = map(add1)(id);

    expect(result.join()).toEqual(4);
  });

  it('should apply a function via map to an Array', () => {
    const add1 = (x) => x + 1;
    const result = map(add1)([3]);

    expect(result).toEqual([4]);
  });
});
