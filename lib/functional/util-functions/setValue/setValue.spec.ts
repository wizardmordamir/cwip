import { setValue } from '.';

const object = { value0: 'value0' };
const objectRef = object;
const objectDeepCopy = JSON.parse(JSON.stringify(object));
const setter = () => ({ value1: 'value1' });
const setterBasedOnValue = ({ value0 }) => ({ value1: value0 + 'value1' });

describe('setValue', () => {
  it('should be curried', () => {
    expect(setValue(setter)(object)).toStrictEqual({ ...object, value1: 'value1' });
    expect(setValue(setterBasedOnValue)(object)).toStrictEqual({
      ...object,
      value1: 'value0value1',
    });
  });
  it('should call setter based on value', () => {
    expect(setValue(setterBasedOnValue)(object)).toStrictEqual({
      ...object,
      value1: 'value0value1',
    });
  });
  it('should call setter without needing arg', () => {
    expect(setValue(setter)(object)).toStrictEqual({ ...object, value1: 'value1' });
  });
  it('should overwrite any keys if they mach passed in object', () => {
    expect(setValue(setter)({ value1: 'will be overwritten' })).toStrictEqual({ value1: 'value1' });
  });

  it('should not mutate original object', () => {
    expect(setValue(setter)(object)).toStrictEqual({ ...object, value1: 'value1' });
    expect(setValue(setterBasedOnValue)(object)).toStrictEqual({
      ...object,
      value1: 'value0value1',
    });
    expect(object).toBe(objectRef);
    expect(object).toStrictEqual(objectDeepCopy);
  });
});
