import { shallowClone } from '.';

describe('shallowClone', () => {
  it('should shallow clone', () => {
    const val = { ref: { a: 1, b: null, c: { d: 1 } } };
    const clone = shallowClone(val);
    expect(clone).toEqual(val);
    val.ref.c.d = 2;
    expect(clone.ref.c.d).toEqual(2);
  });
});
