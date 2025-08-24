import { extend } from '.';

describe('extend', () => {
  it('should extend objects', () => {
    const vals = [{ a: 1 }, { b: 2 }];
    expect(extend(...vals)).toEqual({ a: 1, b: 2 });
  });
});
