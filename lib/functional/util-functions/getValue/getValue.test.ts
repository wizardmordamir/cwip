import { getValue } from '.';

const obj = { a: { b: { c: 'value' } } };
const path = ['a', 'b', 'c'];
const expected = 'value';

describe('getValue', () => {
  it('should return value at given path', () => {
    expect(getValue(path, obj)).toBe(expected);
  });

  it('should return undefined if object is undefined', () => {
    expect(getValue(path, undefined)).toBe(undefined);
  });

  it('should return undefined if object is null', () => {
    expect(getValue(path, null)).toBe(undefined);
  });

  it('should return undefined if object is empty', () => {
    expect(getValue(path, {})).toBe(undefined);
  });

  it('should return object if path is empty', () => {
    expect(getValue([], obj)).toEqual(obj);
  });

  it('should return undefined when final property in path does not exist on object', () => {
    const badPath = [...path, 'c', 'd'];

    expect(getValue(badPath, obj)).toBe(undefined);
  });

  it('should return undefined when property in middle of path is empty object', () => {
    const badPropertyObj = { empty: {} };

    expect(getValue(['empty', 'nextProperty'], badPropertyObj)).toBe(undefined);
  });

  it('should return undefined when property in middle of path is not an object', () => {
    const badPropertyObj = { nonObj: 123 };

    expect(getValue(['nonObj', 'nextProperty'], badPropertyObj)).toBe(undefined);
  });

  it('should return undefined when property in middle of path is undefined', () => {
    const badPropertyObj = { unf: undefined };

    expect(getValue(['unf', 'nextProperty'], badPropertyObj)).toBe(undefined);
  });

  it('should return null when property in middle of path is null', () => {
    const badPropertyObj = { nul: null };

    expect(getValue(['nul'], badPropertyObj)).toBe(null);
  });

  it('should allow partial application', () => {
    const partiallyAppliedGetValue = getValue(path);

    expect(partiallyAppliedGetValue(obj)).toBe(expected);
  });

  it('should return value when array index is in path', () => {
    const objWithArray = { a: [{ c: 'value' }] };

    const pathWithIndex = ['a', '0', 'c'];

    expect(getValue(pathWithIndex, objWithArray)).toBe(expected);
  });
});
