import { describe, expect, it } from 'bun:test';
import { curry } from '.';

const add = curry((a: number, b: number) => a + b);

describe('curry', () => {
  it('should curry the given function', () => {
    // Explicitly type the parameters

    expect(add(1)(2)).toEqual(add(1, 2));
  });

  it('should not persist arguments between calls', () => {
    const add10 = add(10);
    const add1 = add(1);

    expect(add10(10)).toEqual(20);
    expect(add1(1)).toEqual(2);
  });
});
