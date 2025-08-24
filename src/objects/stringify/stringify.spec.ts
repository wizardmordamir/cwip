import { stringify } from '.';

describe('stringify', () => {
  it('should stringify with circular reference', () => {
    const val: any = { ref: { a: 1, b: null, c: { d: 1 } } };
    const val2 = { ref: { a: 1, b: null, c: { d: 1 } } };
    val.ref.g = val.ref;
    const result = JSON.parse(stringify(val));
    expect(result).toEqual(val2);
    expect(result.ref.g).toBeUndefined();
  });
});
