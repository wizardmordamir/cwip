import { isEmpty } from '.';

const emptyArr = [];
const emptyObj = {};
const array = [1, 2, 3, 4, 5];
const obj = { a: 1, b: 2, c: 3 };

describe('isEmpty', () => {
  it('should return true if passed []', () => {
    const actual = isEmpty(emptyArr);

    expect(actual).toEqual(true);
  });

  it('should return false if passed non-empty array', () => {
    const actual = isEmpty(array);

    expect(actual).toEqual(false);
  });

  it('should return true if passed {}', () => {
    const actual = isEmpty(emptyObj);

    expect(actual).toEqual(true);
  });

  it('should return false if passed non-empty object', () => {
    const actual = isEmpty(obj);

    expect(actual).toEqual(false);
  });

  it('should return true if passed null', () => {
    const actual = isEmpty(null);

    expect(actual).toEqual(true);
  });

  it('should return true if passed undefined', () => {
    const actual = isEmpty(undefined);

    expect(actual).toEqual(true);
  });
});
