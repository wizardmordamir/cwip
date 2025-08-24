import { join } from '.';
import { Identity } from '../../monads/identity';

describe('Join Function', () => {
  it('should return value from a Monad', () => {
    const id = Identity(3);
    const result = join(id);

    expect(result).toEqual(3);
  });
});
