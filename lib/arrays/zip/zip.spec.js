import { zip } from '.';

describe('zip', () => {
  it('zips multiple arrays', () => {
    const arrays = [
      [1, 2],
      [1, 2],
      [1, 2],
    ];
    const expected = [
      [1, 1, 1],
      [2, 2, 2],
    ];
    expect(zip(...arrays)).toEqual(expected);
  });

  it('zips multiple arrays with different lengths', () => {
    const arrays = [
      [1, 2],
      [1, 2, 3, 4],
      [1, 2, 3],
    ];
    const expected = [
      [1, 1, 1],
      [2, 2, 2],
    ];
    expect(zip(...arrays)).toEqual(expected);
  });

  it('handles nothing to zip', () => {
    const arrays = [[]];
    const expected = [];
    expect(zip(...arrays)).toEqual(expected);
  });

  it('handles nothing to zip in one sub array of many', () => {
    const arrays = [[], [1, 2]];
    const expected = [];
    expect(zip(...arrays)).toEqual(expected);
  });

  it('handles arrays of objects', () => {
    const arrays = [
      [{ a: 1 }, { a: 2 }],
      [{ b: 1 }, { b: 2 }],
    ];
    const expected = [
      [{ a: 1 }, { b: 1 }],
      [{ a: 2 }, { b: 2 }],
    ];
    expect(zip(...arrays)).toEqual(expected);
  });
});
