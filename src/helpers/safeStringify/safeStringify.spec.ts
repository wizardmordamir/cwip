import { safeStringify, safeStringifyIfNeeded } from '.';

describe('safeStringify', () => {
  it('stringifies primitives', () => {
    expect(safeStringify(123)).toBe('123');
    expect(safeStringify(undefined)).toBe(undefined);
    expect(safeStringify(null)).toBe('null');
    expect(safeStringify('hello')).toBe('hello');
    expect(safeStringify(true)).toBe('true');
    expect(safeStringify(false)).toBe('false');
    expect(safeStringify(Symbol('foo'))).toBe('Symbol(foo)');
    expect(safeStringify(() => {})).toBe('() => {}');
  });

  it('handles objects', () => {
    expect(safeStringify({ foo: undefined })).toBe('{}');
    expect(safeStringify({ foo: 'bar', arr: [1, 2] })).toBe('{"foo":"bar","arr":[1,2]}');
  });

  it('handles Date objects', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    expect(safeStringify({ date })).toBe(`{"date":"${date.toISOString()}"}`);
  });

  it('handles RegExp objects', () => {
    const regex = /abc/gi;
    expect(safeStringify({ regex })).toBe('{"regex":"/abc/gi"}');
  });

  it('handles Set objects', () => {
    const set = new Set([1, 2, 3]);
    expect(safeStringify({ set })).toBe('{"set":[1,2,3]}');
  });

  it('handles Map objects with string keys', () => {
    const map = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    expect(safeStringify({ map })).toBe('{"map":[["a",1],["b",2]]}');
  });

  it('handles Map objects with non-string keys', () => {
    const keyObj = { k: 1 };
    const map = new Map([[keyObj, 2]]);
    expect(safeStringify({ map })).toBe(`{"map":[[${safeStringify(keyObj)},2]]}`);
  });

  it('handles Error objects', () => {
    const err = new Error('fail');
    err.name = 'CustomError';
    (err as any).extra = 42;
    const result = JSON.parse(safeStringify({ err }));
    expect(result.err.name).toBe('CustomError');
    expect(result.err.message).toBe('fail');
    expect(typeof result.err.stack).toBe('string');
    expect(result.err.extra).toBe(42);
  });

  it('handles functions and symbols in objects', () => {
    const fn = function test() {};
    const sym = Symbol('sym');
    const obj = { fn, sym };
    const str = safeStringify(obj);
    expect(str).toContain('"fn":"function test() {}"');
    expect(str).toContain('"sym":"Symbol(sym)"');
  });

  it('handles deeply nested circular structures', () => {
    const obj: any = { a: 1 };
    obj.b = { c: obj };
    expect(safeStringify(obj)).toBe('{"a":1,"b":{"c":"[Circular]"}}');
  });

  it('handles circular references', () => {
    const obj = { foo: 'bar' };
    (obj as any).self = obj;
    expect(safeStringify(obj)).toBe('{"foo":"bar","self":"[Circular]"}');
  });

  it('handles arrays', () => {
    expect(safeStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(safeStringify(['a', 'b', 'c'])).toBe('["a","b","c"]');
  });

  it('should not add extra parenthesis', () => {
    const obj = {
      data: {
        id: 1,
        name: 'Test',
      },
      arr: [1, 2, 3],
      nested: {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      },
    };

    expect(safeStringify(obj)).toBe(
      '{"data":{"id":1,"name":"Test"},"arr":[1,2,3],"nested":{"level1":{"level2":{"level3":"deep value"}}}}',
    );
  });
});

describe('safeStringifyIfNeeded', () => {
  it('returns strings as-is', () => {
    expect(safeStringifyIfNeeded('already a string')).toBe('already a string');
  });

  it('stringifies non-string values', () => {
    expect(safeStringifyIfNeeded(123)).toBe('123');
    expect(safeStringifyIfNeeded({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });

  it('handles circular references', () => {
    const obj = { foo: 'bar' };
    (obj as any).self = obj;
    expect(safeStringifyIfNeeded(obj)).toBe('{"foo":"bar","self":"[Circular]"}');
  });

  it('handles replacer and space parameters', () => {
    const obj = { foo: 'bar', baz: 'qux' };
    expect(safeStringifyIfNeeded(obj, ['foo'], 2)).toBe('{\n  "foo": "bar"\n}');
  });
});
