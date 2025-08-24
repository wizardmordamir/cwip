import { reduce } from '.';

const numArr = [1, 2, 3];
const numReducerFn = (a, b) => a + b;

describe('reduce', () => {
  it('should reduce array with given function and initial value to new value', () => {
    const result = reduce(numReducerFn, 0)(numArr);

    expect(result).toEqual(6);
  });
});
