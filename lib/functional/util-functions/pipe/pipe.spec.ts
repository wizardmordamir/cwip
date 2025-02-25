import { pipe } from '.';

describe('pipe', () => {
  const inc = (x) => x + 1;
  const mult = (multiplier) => (x) => x * multiplier;

  it('should run multiple functions left-to-right in serial', () => {
    const actual = pipe(inc, mult(3), inc, mult(3))(1);
    expect(actual).toEqual(21);
  });
});
