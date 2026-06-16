import { describe, expect, test } from 'bun:test';
import { getFunctionName } from './getFunctionName';

describe('getFunctionName', () => {
  test('should return the function name when function has a name property', () => {
    function namedFunction() {}
    expect(getFunctionName(namedFunction)).toBe('namedFunction');
  });

  test('should return the function name from named function expression', () => {
    const fn = function myFunction() {};
    expect(getFunctionName(fn)).toBe('myFunction');
  });

  test('should handle function with custom name property set via Object.defineProperty', () => {
    const fn = () => {};
    Object.defineProperty(fn, 'name', { value: 'customName' });
    expect(getFunctionName(fn)).toBe('customName');
  });

  test('should handle class constructors', () => {
    class MyClass {}
    expect(getFunctionName(MyClass)).toBe('MyClass');
  });

  test('should handle async functions', () => {
    async function asyncFn() {}
    expect(getFunctionName(asyncFn)).toBe('asyncFn');
  });

  test('should handle generator functions', () => {
    function* generatorFn() {}
    expect(getFunctionName(generatorFn)).toBe('generatorFn');
  });

  test('should handle bound functions', () => {
    function originalFn() {}
    const boundFn = originalFn.bind(null);
    expect(getFunctionName(boundFn)).toBe('bound originalFn');
  });

  test('should handle null or undefined input', () => {
    expect(getFunctionName(null)).toBeUndefined();
    expect(getFunctionName(undefined)).toBeUndefined();
  });

  test('should handle non-function input', () => {
    expect(getFunctionName('not a function')).toBeUndefined();
    expect(getFunctionName(123)).toBeUndefined();
    expect(getFunctionName({})).toBeUndefined();
  });

  test('should return null for functions with empty names', () => {
    const fn = () => {};
    Object.defineProperty(fn, 'name', { value: '' });
    expect(getFunctionName(fn)).toBeNull();
  });

  test('should return null for anonymous function returned from higher-order function (createPipeline case)', () => {
    const createSomething = (..._args) => {
      return async (initialValue) => {
        return initialValue;
      };
    };

    const result = createSomething('arg1', 'arg2');
    expect(getFunctionName(result)).toBeNull();
  });

  test('should demonstrate the difference between assigned and returned anonymous functions', () => {
    const assignedFn = () => {};
    expect(['assignedFn', null].includes(getFunctionName(assignedFn))).toBe(true);

    const factory = () => {
      return () => {};
    };
    const returnedFn = factory();
    expect(getFunctionName(returnedFn)).toBeNull();
  });
});
