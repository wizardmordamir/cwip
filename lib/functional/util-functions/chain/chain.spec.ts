import { chain } from '.';
import { Identity } from '../../monads/identity';

describe('Chain Function', () => {
  it('should apply a function via chain method on a Monad', () => {
    const add1 = (x) => x + 1;
    const id = Identity(3);
    const result = chain(add1)(id);

    expect(result).toEqual(4);
  });
});
