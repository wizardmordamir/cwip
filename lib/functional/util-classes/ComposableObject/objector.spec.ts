import { ComposableObject } from '.';
import { curry, pipe } from '../../util-functions';

describe('ComposableObject Entries', () => {
  it('should return an array of tuples from object properties', () => {
    const obj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
    const fn = (keyValueTuple): string => keyValueTuple;

    const result: unknown[] = ComposableObject.entries(fn, obj);
    expect(result).toEqual([
      ['prop1', 'value1'],
      ['prop2', 'value2'],
      ['prop3', 'value3'],
    ]);
  });

  it('should return error tuple when non object is given', () => {
    const objEntries: Function = ComposableObject.entries(() => 'doing Nothing');

    const result = pipe(objEntries)('hello');

    expect(result).toEqual([['Error', 'Non Object Provided']]);
  });

  it('should return an array of objects from object properties', () => {
    const obj = { prop1: 'value' };
    const fn = curry((obj, keyValueTuple): object => {
      return { key: keyValueTuple[0], value: keyValueTuple[1], length: keyValueTuple[1].length };
    });

    const result: unknown[] = ComposableObject.entries(fn(obj), obj);
    expect(result).toEqual([{ key: 'prop1', value: 'value', length: 5 }]);
  });

  it('should return a new object from original object properties', () => {
    const obj = { prop1: 'value', prop2: 'val' };
    const fn = curry((obj, keyValueTuple): object => {
      return {
        [keyValueTuple[0]]: keyValueTuple[1],
        [`${keyValueTuple[0]}Length`]: keyValueTuple[1].length,
      };
    });

    const result: object = ComposableObject.entries(fn(obj), obj).reduce(
      (acc: object, item: any) => {
        return { ...acc, ...item };
      },
      {},
    );

    expect(result).toEqual({ prop1: 'value', prop1Length: 5, prop2: 'val', prop2Length: 3 });
  });

  it('should allow devs to utilize a pipe composition', () => {
    const obj = { prop1: 'value', prop2: 'val' };

    const fn = curry((obj, keyValueTuple): object => {
      return {
        [keyValueTuple[0]]: keyValueTuple[1],
        [`${keyValueTuple[0]}Length`]: keyValueTuple[1].length,
      };
    });

    const reducto = (results: object[]): object =>
      results.reduce((acc: object, item: object) => {
        return { ...acc, ...item };
      }, {});

    const result = (obj): object => pipe(ComposableObject.entries(fn(obj)), reducto)(obj);

    expect(result(obj)).toEqual({ prop1: 'value', prop1Length: 5, prop2: 'val', prop2Length: 3 });
  });
});

describe('ComposableObject Keys', () => {
  it('should return an array of strings from object properties', () => {
    const obj = { prop1: 'value', prop2: 'value', prop3: 'value' };
    const fn = (property): string => property;

    const result: unknown[] = ComposableObject.keys(fn, obj);
    expect(result).toEqual(['prop1', 'prop2', 'prop3']);
  });

  it('should return error array when non object is given', () => {
    const objEntries: Function = ComposableObject.keys(() => 'doing Nothing');

    const result = pipe(objEntries)('hello');

    expect(result).toEqual(['Error:Non Object Provided']);
  });

  it('should return an array of objects from object properties', () => {
    const obj = { prop1: 'value' };
    const fn = curry((obj, property): object => {
      return { key: property, value: obj[property], length: property.length };
    });

    const result: unknown[] = ComposableObject.keys(fn(obj), obj);
    expect(result).toEqual([{ key: 'prop1', value: 'value', length: 5 }]);
  });

  it('should return a new object from original object properties', () => {
    const obj = { prop1: 'value', prop2: 'val' };
    const fn = curry((obj, property): object => {
      return { [property]: obj[property], [`${property}Length`]: obj[property].length };
    });

    const result: object = ComposableObject.keys(fn(obj), obj).reduce((acc: object, item: any) => {
      return { ...acc, ...item };
    }, {});

    expect(result).toEqual({ prop1: 'value', prop1Length: 5, prop2: 'val', prop2Length: 3 });
  });

  it('should allow devs to utilize a pipe composition', () => {
    const obj = { prop1: 'value', prop2: 'val' };

    const fn = curry((obj, property): object => {
      return { [property]: obj[property], [`${property}Length`]: obj[property].length };
    });

    const reducto = (results: object[]): object =>
      results.reduce((acc: object, item: object) => {
        return { ...acc, ...item };
      }, {});

    const result = (obj): object => pipe(ComposableObject.keys(fn(obj)), reducto)(obj);

    expect(result(obj)).toEqual({ prop1: 'value', prop1Length: 5, prop2: 'val', prop2Length: 3 });
  });
});

describe('ComposableObject Values', () => {
  it('should return an array of strings that are equal to the property values of the object provided', () => {
    const obj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
    const fn = (property): string => property;

    const result: unknown[] = ComposableObject.values(fn, obj);

    expect(result).toEqual(['value1', 'value2', 'value3']);
  });

  it('should return error array when non object is given', () => {
    const objEntries: Function = ComposableObject.values(() => 'doing Nothing');

    const result = pipe(objEntries)('hello');

    expect(result).toEqual(['Error:Non Object Provided']);
  });

  it('should allow devs to use pipe composition', () => {
    const obj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
    const fn = (property): string => property;

    const objValues: Function = ComposableObject.values(fn);

    const result = (object: Record<string, any>): unknown[] => pipe(objValues)(object);

    expect(result(obj)).toEqual(['value1', 'value2', 'value3']);
  });
});

describe('ComposableObject Merge Objects', () => {
  it('should merge the objects given without side effects', () => {
    const obj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
    const obj2 = { newProp: 'newValue' };
    const expectation = { ...obj, ...obj2 };

    const result: Record<string, any> = ComposableObject.mergeObjects(obj2, obj);

    expect(result).toEqual(expectation);
    expect(obj).toEqual({ prop1: 'value1', prop2: 'value2', prop3: 'value3' });
    expect(obj2).toEqual({ newProp: 'newValue' });
  });

  it('should return object with an Error Property when non object is given', () => {
    const obj2 = { newProp: 'newValue' };

    const objEntries: Function = ComposableObject.mergeObjects(obj2);

    const result = pipe(objEntries)('hello');

    expect(result).toEqual({ Error: 'Non Object Provided' });
  });

  it('should allow devs to use pipe composition', () => {
    const obj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
    const obj2 = { newProp: 'newValue' };
    const expectation = { ...obj, ...obj2 };
    const objMerger: Function = ComposableObject.mergeObjects(obj2);

    const result = (object: Record<string, any>): unknown[] => pipe(objMerger)(object);

    expect(result(obj)).toEqual(expectation);
    expect(obj).toEqual({ prop1: 'value1', prop2: 'value2', prop3: 'value3' });
    expect(obj2).toEqual({ newProp: 'newValue' });
  });
});

describe('ComposableObject From Entries Create Object', () => {
  it('should create an object from given tuple key, value array', () => {
    const objEntries = [
      ['prop1', 'value1'],
      ['prop2', { hello: 'I am a nested Obj' }],
      ['prop3', ['more things', 'oh look']],
      ['prop4', 1],
    ] as Iterable<readonly [PropertyKey, any]>;
    const expectation = {
      prop1: 'value1',
      prop2: { hello: 'I am a nested Obj' },
      prop3: ['more things', 'oh look'],
      prop4: 1,
    };

    const result: Record<string, any> = ComposableObject.fromEntries(objEntries);

    expect(result).toEqual(expectation);
  });

  it('should throw an error when not given a proper tuple', () => {
    const objEntries = [
      'prop1',
      'value1',
      'prop2',
      { hello: 'I am a nested Obj' },
      'prop3',
      ['more things', 'oh look'],
      'prop4',
      1,
    ] as Iterable<readonly [PropertyKey, any]>;
    const expectation = { Error: 'Iterator value prop1 is not an entry object' };

    const errorResult: Record<string, any> = pipe(ComposableObject.fromEntries)(objEntries);

    const errorResult2: Record<string, any> = pipe(ComposableObject.fromEntries)('boo');

    expect(errorResult).toEqual(expectation);
    expect(errorResult2).toHaveProperty('Error');
  });
});
