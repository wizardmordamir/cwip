import { excludesKeys } from '.';

describe('excludesKeys', () => {
  it('should find missing keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(excludesKeys(keys, obj)).toEqual(['d', 'e', 'f']);
  });
});
