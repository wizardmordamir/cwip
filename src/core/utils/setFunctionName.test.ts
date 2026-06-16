import { describe, expect, test } from 'bun:test';
import { setFunctionName } from './setFunctionName';

describe('setFunctionName', () => {
  test('should set the function name on anonymous arrow function', () => {
    const fn = () => {};
    const namedFn = setFunctionName('myFunction', fn);
    expect(namedFn.name).toBe('myFunction');
  });

  test('should set the function name on named function', () => {
    function originalFunction() {}
    const renamedFn = setFunctionName('newName', originalFunction);
    expect(renamedFn.name).toBe('newName');
  });

  test('should return the same function instance', () => {
    const fn = () => {};
    const namedFn = setFunctionName('test', fn);
    expect(namedFn).toBe(fn); // Same reference
  });

  test('should preserve function behavior', () => {
    const fn = (a: number, b: number) => a + b;
    const namedFn = setFunctionName('add', fn);
    expect(namedFn(2, 3)).toBe(5);
    expect(namedFn.name).toBe('add');
  });

  test('should work with async functions', () => {
    const asyncFn = async () => 'result';
    const namedAsyncFn = setFunctionName('asyncTest', asyncFn);
    expect(namedAsyncFn.name).toBe('asyncTest');
  });

  test('should work with generator functions', () => {
    function* generatorFn() {
      yield 1;
    }
    const namedGeneratorFn = setFunctionName('myGenerator', generatorFn);
    expect(namedGeneratorFn.name).toBe('myGenerator');
  });

  test('should work with class constructors', () => {
    class MyClass {}
    const RenamedClass = setFunctionName('RenamedClass', MyClass as any);
    expect(RenamedClass.name).toBe('RenamedClass');
  });

  test('should work with bound functions', () => {
    function originalFn(this: any) {
      return this;
    }
    const boundFn = originalFn.bind({ test: true });
    const namedBoundFn = setFunctionName('boundTest', boundFn);
    expect(namedBoundFn.name).toBe('boundTest');
  });

  test('should handle empty string names', () => {
    const fn = () => {};
    const namedFn = setFunctionName('', fn);
    expect(namedFn.name).toBe('');
  });

  test('should handle names with spaces and special characters', () => {
    const fn = () => {};
    const namedFn = setFunctionName('my special function!', fn);
    expect(namedFn.name).toBe('my special function!');
  });

  test('should overwrite existing function names', () => {
    function existingName() {}
    expect(existingName.name).toBe('existingName');

    const renamedFn = setFunctionName('newName', existingName);
    expect(renamedFn.name).toBe('newName');
  });

  test('should preserve function properties and methods', () => {
    const fn = () => {};
    (fn as any).customProperty = 'test';

    const namedFn = setFunctionName('test', fn);
    expect((namedFn as any).customProperty).toBe('test');
    expect(namedFn.length).toBe(fn.length); // Parameter count
  });

  test('should work with functions that have complex signatures', () => {
    const complexFn = <T>(arg1: T, _arg2: string, ..._rest: number[]): T => arg1;
    const namedComplexFn = setFunctionName('complexFunction', complexFn);

    expect(namedComplexFn.name).toBe('complexFunction');
    expect(namedComplexFn('test', 'arg2', 1, 2, 3)).toBe('test');
  });

  test('should maintain function prototype', () => {
    function ConstructorFn(this: any) {
      this.value = 42;
    }
    ConstructorFn.prototype.getValue = function () {
      return this.value;
    };

    const RenamedConstructor = setFunctionName('RenamedConstructor', ConstructorFn);
    expect(RenamedConstructor.name).toBe('RenamedConstructor');
    expect(RenamedConstructor.prototype.getValue).toBeDefined();
  });
});
