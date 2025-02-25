import { randomAlpahNumeric } from '.';
import { isString } from '../../js-types';

describe('randomAlpahNumeric', () => {
  it('should create random alpah numeric string to given length', () => {
    const lens = [1, 5, 10];
    expect(lens.map(randomAlpahNumeric).map((val) => isString(val) && val.length)).toEqual(lens);
  });
});
