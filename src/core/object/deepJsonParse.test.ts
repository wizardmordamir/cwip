import { describe, expect, it } from 'bun:test';
import { deepJsonParse, isPlainObject, safeParse } from '.';

describe('deepJsonParse', () => {
  it('parses nested JSON strings in objects and arrays', () => {
    const input = { a: '{"b":"{\\"c\\":3}"}', d: '[1,2,"{\\"e\\":4}"]' };
    const output = deepJsonParse(input);
    expect(output).toEqual({ a: { b: { c: 3 } }, d: [1, 2, { e: 4 }] });
  });

  it('handles non-string values correctly', () => {
    const input = {
      num: 42,
      bool: true,
      nil: null,
      undef: undefined,
      arr: [1, '2', '{"three":3}'],
      obj: { nested: '{"four":4}' },
    };
    const output = deepJsonParse(input);
    expect(output).toEqual({
      num: 42,
      bool: true,
      nil: null,
      undef: undefined,
      arr: [1, 2, { three: 3 }],
      obj: { nested: { four: 4 } },
    });
  });

  it('prevents infinite recursion with circular references', () => {
    const obj: any = { a: 1 };
    obj.b = obj; // circular reference
    const output = deepJsonParse(obj);
    expect(output).toEqual({ a: 1, b: output });
  });

  it('limits recursion depth to prevent excessive processing', () => {
    let deepString = '"value"';
    for (let i = 0; i < 15; i++) {
      deepString = `"${deepString}"`;
    }
    let expected = deepString;
    for (let i = 0; i < 10; i++) {
      try {
        expected = JSON.parse(expected);
      } catch {
        break;
      }
    }
    const input = { deep: deepString };
    const output = deepJsonParse(input, new WeakSet(), 10);
    // Should stop parsing after reaching max depth
    expect(output).toEqual({ deep: expected });
  });

  it('returns original value if JSON.parse fails', () => {
    const input = { invalid: '{"a":1', valid: '{"b":2}' };
    const output = deepJsonParse(input);
    expect(output).toEqual({ invalid: '{"a":1', valid: { b: 2 } });
  });
});

describe('isPlainObject', () => {
  it('identifies plain objects correctly', () => {
    expect(isPlainObject({})).toEqual(true);
    expect(isPlainObject({ a: 1 })).toEqual(true);
    expect(isPlainObject(new Object())).toEqual(true);
    expect(isPlainObject(Object.create(null))).toEqual(true);
  });

  it('rejects non-plain objects', () => {
    expect(isPlainObject(null)).toEqual(false);
    expect(isPlainObject([])).toEqual(false);
    expect(isPlainObject(() => {})).toEqual(false);
    expect(isPlainObject(new Date())).toEqual(false);
    expect(isPlainObject(/regex/)).toEqual(false);
    expect(isPlainObject(new Map())).toEqual(false);
    expect(isPlainObject(new Set())).toEqual(false);
  });
});

describe('safeParse', () => {
  it('parses valid JSON strings', () => {
    expect(safeParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeParse('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns original value for non-string inputs', () => {
    expect(safeParse(42)).toEqual(42);
    expect(safeParse(true)).toEqual(true);
    expect(safeParse(null)).toEqual(null);
    expect(safeParse(undefined)).toEqual(undefined);
    const obj = { a: 1 };
    expect(safeParse(obj)).toEqual(obj);
  });

  it('returns original string if JSON.parse fails', () => {
    expect(safeParse('invalid json')).toEqual('invalid json');
    expect(safeParse('{"a":1')).toEqual('{"a":1');
  });
});

/*
add tests for these helper functions:
export const isStringNumber = (value: any): boolean =>
  typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '';

export const isStringBoolean = (value: any): boolean =>
  typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false');

export const isStringNull = (value: any): boolean =>
  typeof value === 'string' && value.toLowerCase() === 'null';

add tests for the new skipParsingFn parameter to safeParse and deepJsonParse
*/

describe('safeParse with skipParsingFn', () => {
  const skipIfNumberString = (value: any) => {
    return typeof value === 'string' && !Number.isNaN(Number(value)) && value.trim() !== '';
  };

  it('skips parsing for strings that match skipParsingFn', () => {
    expect(safeParse('42', skipIfNumberString)).toEqual('42'); // should skip parsing
    expect(safeParse('3.14', skipIfNumberString)).toEqual('3.14'); // should skip parsing
  });

  it('parses strings that do not match skipParsingFn', () => {
    expect(safeParse('{"a":1}', skipIfNumberString)).toEqual({ a: 1 });
    expect(safeParse('[1,2,3]', skipIfNumberString)).toEqual([1, 2, 3]);
  });
});

describe('deepJsonParse with skipParsingFn', () => {
  const skipIfBooleanString = (value: any) => {
    return typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false');
  };

  it('skips parsing for strings that match skipParsingFn', () => {
    const input = { a: 'true', b: 'false', c: '{"d":4}' };
    const output = deepJsonParse(input, new WeakSet(), 10, 0, skipIfBooleanString);
    expect(output).toEqual({ a: 'true', b: 'false', c: { d: 4 } }); // 'true' and 'false' should not be parsed
  });

  it('parses strings that do not match skipParsingFn', () => {
    const input = { a: '42', b: '{"c":3}' };
    const output = deepJsonParse(input, new WeakSet(), 10, 0, skipIfBooleanString);
    expect(output).toEqual({ a: 42, b: { c: 3 } }); // '42' should be parsed
  });
});
