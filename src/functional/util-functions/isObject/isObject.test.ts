import { isObject } from '.';

const object = { test: 'test' };
const array = [object];
const string = '{}';
const number = 1;
const func = () => object;
const nullValue = null;
const undefinedValue = undefined;
const objectAssign = Object.assign({ test: 'test' }, { test2: 'test2' });
const objectAssignNull = Object.assign({}, null);
const objectCreate = Object.create({ test: 'test' });
const objectCreateEdgeCase = Object.create(null);

describe('isObject', () => {
  it('correctly identifies plain objects', () => {
    expect(isObject(object)).toEqual(true);
    expect(isObject(objectAssign)).toEqual(true);
    expect(isObject(objectAssignNull)).toEqual(true);
    expect(isObject(objectCreate)).toEqual(true);
    expect(isObject(objectCreateEdgeCase)).toEqual(true);
    expect(isObject(array)).toEqual(false);
    expect(isObject(string)).toEqual(false);
    expect(isObject(number)).toEqual(false);
    expect(isObject(func)).toEqual(false);
    expect(isObject(nullValue)).toEqual(false);
    expect(isObject(undefinedValue)).toEqual(false);
  });
});
