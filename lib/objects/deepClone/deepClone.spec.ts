import { deepClone } from '.';

describe('deepClone', () => {
  it('should deep clone', () => {
    const val = { ref: { a: 1, b: null, c: { d: 1 } } };
    const clone = deepClone(val);
    expect(clone).toEqual(val);
    val.ref.c.d = 2;
    expect(clone.ref.c.d).toEqual(1);
  });
});
