import { safeStringify, safeStringifyIfNeeded } from './safeStringify';

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
