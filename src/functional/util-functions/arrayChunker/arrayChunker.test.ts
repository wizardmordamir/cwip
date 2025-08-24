import { arrayChunker } from '.';

const arrayOfFive = [1, 2, 3, 4, 5];
const arrayOfSix = [1, 2, 3, 4, 5, 6];
const arrayOfEight = [1, 2, '3', 4, 5, { a: 1 }, 7, 8];

describe('arrayChunker', () => {
  it('correctly splits array into chunks of a specified size', () => {
    expect(arrayChunker(2, arrayOfFive)).toEqual([[1, 2], [3, 4], [5]]);
    expect(arrayChunker(8, arrayOfFive)).toEqual([arrayOfFive]);
    expect(arrayChunker(3, arrayOfSix)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(arrayChunker(4, arrayOfEight)).toEqual([
      [1, 2, '3', 4],
      [5, { a: 1 }, 7, 8],
    ]);
    expect(arrayChunker(5, arrayOfEight)).toEqual([
      [1, 2, '3', 4, 5],
      [{ a: 1 }, 7, 8],
    ]);
  });

  it('should allow partial application', () => {
    const partiallyAppliedArrayChunker = arrayChunker(2);

    expect(partiallyAppliedArrayChunker(arrayOfFive)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should return empty array if passed an empty array', () => {
    const actual = arrayChunker(2, []);

    const expected = [];

    expect(actual).toEqual(expected);
  });
});
