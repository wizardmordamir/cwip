import { sort } from '.';

describe('sort', () => {
  it('should sort array with given function', () => {
    const arr = [30, 4, 305, 100];
    const sortFn = (a, b) => a - b;
    const result = sort(sortFn)(arr);

    expect(result).toEqual([4, 30, 100, 305]);
  });
  it('should sort array with native sort function provided', () => {
    const arr = ['d', 'a', 'c', 'b'];
    const result = sort()(arr);

    expect(result).toEqual(arr.sort());
  });
});
