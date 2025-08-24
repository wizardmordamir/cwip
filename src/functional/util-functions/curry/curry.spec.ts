import { curry } from '.';

describe('curry', () => {
  it('should curry the given function', () => {
    const add = curry((a, b) => a + b);
    expect(add(1)(2)).toEqual(add(1, 2));
  });

  it('should not persist arguments between calls', () => {
    const add = curry((a, b) => a + b);
    const add10 = add(10);
    const add1 = add(1);
    expect(add10(10)).toEqual(20);
    expect(add1(1)).toEqual(2);
  });
});
