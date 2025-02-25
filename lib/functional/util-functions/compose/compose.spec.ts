import { compose } from '.';

describe('compose', () => {
  const inc = (x) => x + 1;
  const mult = (multiplier) => (x) => x * multiplier;

  it('should run multiple functions right-to-left in serial', () => {
    const actual = compose(inc, mult(3), inc, mult(3))(1);
    expect(actual).toEqual(13);
  });
});
