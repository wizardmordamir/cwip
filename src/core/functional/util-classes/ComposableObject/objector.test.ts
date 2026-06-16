import { describe, expect, it } from 'bun:test';
import { curry, pipe } from '../../../flow';
import { ComposableObject } from '.';

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
    const objEntries: (...args: any[]) => any = ComposableObject.entries(() => 'doing Nothing');

    const result = pipe(objEntries)('hello');

    expect(result).toEqual([['Error', 'Non Object Provided']]);
  });

  it('should return an array of objects from object properties', () => {
    const obj = { prop1: 'value' };
    const fn = curry((_obj, keyValueTuple): object => {
      return { key: keyValueTuple[0], value: keyValueTuple[1], length: keyValueTuple[1].length };
    });

    const result: unknown[] = ComposableObject.entries(fn(obj), obj);
    expect(result).toEqual([{ key: 'prop1', value: 'value', length: 5 }]);
  });

  it('should return a new object from original object properties', () => {
    const obj = { prop1: 'value', prop2: 'val' };
    const fn = curry((_obj, keyValueTuple): object => {
      return {
        [keyValueTuple[0]]: keyValueTuple[1],
        [`${keyValueTuple[0]}Length`]: keyValueTuple[1].length,
      };
    });

    const result: object = ComposableObject.entries(fn(obj), obj).reduce((acc: object, item: any) => {
      // biome-ignore lint: allowing spread operator for better readability
      return { ...acc, ...item };
    }, {});

    expect(result).toEqual({ prop1: 'value', prop1Length: 5, prop2: 'val', prop2Length: 3 });
  });

  it('should allow devs to utilize a pipe composition', () => {
    const obj = { prop1: 'value', prop2: 'val' };

    const fn = curry((_obj, keyValueTuple): object => {
      return {
        [keyValueTuple[0]]: keyValueTuple[1],
        [`${keyValueTuple[0]}Length`]: keyValueTuple[1].length,
      };
    });

    const reducto = (results: object[]): object =>
      results.reduce((acc: object, item: object) => {
        // biome-ignore lint: allowing spread operator for better readability
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
    const objEntries: (...args: any[]) => any = ComposableObject.keys(() => 'doing Nothing');

    const result = pipe(objEntries)('hello');

    expect(result).toEqual(['Error:Non Object Provided']);
  });

  it('should return an array of objects from object properties', () => {
    const obj = { prop1: 'value' };
    // Explicitly type 'property' as string and 'obj' as any/Record
    const fn = curry((obj: Record<string, any>, property: string): object => {
      return { key: property, value: obj[property], length: property.length };
    });

    const result: unknown[] = ComposableObject.keys(fn(obj), obj);
    expect(result).toEqual([{ key: 'prop1', value: 'value', length: 5 }]);
  });

  it('should return a new object from original object properties', () => {
    const obj = { prop1: 'value', prop2: 'val' };
    const fn = curry((obj: Record<string, any>, property: string): object => {
      return { [property]: obj[property], [`${property}Length`]: obj[property].length };
    });

    const result = ComposableObject.keys(fn(obj), obj).reduce((acc: object, item: any) => {
      // biome-ignore lint/performance/noAccumulatingSpread: <>
      return { ...acc, ...item };
    }, {});

    expect(result).toEqual({ prop1: 'value', prop1Length: 5, prop2: 'val', prop2Length: 3 });
  });

  it('should allow devs to utilize a pipe composition', () => {
    const obj = { prop1: 'value', prop2: 'val' };

    const fn = curry((obj, property): object => {
      return { [property as string]: obj[property as string], [`${property}Length`]: obj[property as string].length };
    });

    const reducto = (results: object[]): object =>
      results.reduce((acc: object, item: object) => {
        // biome-ignore lint: allowing spread operator for better readability
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
    const objEntries: (...args: any[]) => any = ComposableObject.values(() => 'doing Nothing');

    const result = pipe(objEntries)('hello');

    expect(result).toEqual(['Error:Non Object Provided']);
  });

  it('should allow devs to use pipe composition', () => {
    const obj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
    const fn = (property): string => property;

    const objValues: (...args: any[]) => any = ComposableObject.values(fn);

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

    const objEntries: (...args: any[]) => any = ComposableObject.mergeObjects(obj2);

    const result = pipe(objEntries)('hello');

    expect(result).toEqual({ Error: 'Non Object Provided' });
  });

  it('should allow devs to use pipe composition', () => {
    const obj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
    const obj2 = { newProp: 'newValue' };
    const expectation = { ...obj, ...obj2 };
    const objMerger: (...args: any[]) => any = ComposableObject.mergeObjects(obj2);

    // Change return type from unknown[] to object
    const result = (object: Record<string, any>): object => pipe(objMerger)(object);

    expect(result(obj)).toEqual(expectation);
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
    const expectation = { Error: expect.any(String) };

    const errorResult: Record<string, any> = pipe(ComposableObject.fromEntries)(objEntries);

    expect(errorResult).toEqual(expectation);
  });
});
