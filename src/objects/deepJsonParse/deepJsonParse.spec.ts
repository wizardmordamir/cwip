import {
  deepJsonParse,
  isPlainObject,
  isStringBoolean,
  isStringNumber,
  isStringNull,
  tryJsonParse,
} from '.';

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

describe('tryJsonParse', () => {
  it('parses valid JSON strings', () => {
    expect(tryJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(tryJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns original value for non-string inputs', () => {
    expect(tryJsonParse(42)).toEqual(42);
    expect(tryJsonParse(true)).toEqual(true);
    expect(tryJsonParse(null)).toEqual(null);
    expect(tryJsonParse(undefined)).toEqual(undefined);
    const obj = { a: 1 };
    expect(tryJsonParse(obj)).toEqual(obj);
  });

  it('returns original string if JSON.parse fails', () => {
    expect(tryJsonParse('invalid json')).toEqual('invalid json');
    expect(tryJsonParse('{"a":1')).toEqual('{"a":1');
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

add tests for the new skipParsingFn parameter to tryJsonParse and deepJsonParse
*/

describe('tryJsonParse with skipParsingFn', () => {
  const skipIfNumberString = (value: any) => {
    return typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '';
  };

  it('skips parsing for strings that match skipParsingFn', () => {
    expect(tryJsonParse('42', skipIfNumberString)).toEqual('42'); // should skip parsing
    expect(tryJsonParse('3.14', skipIfNumberString)).toEqual('3.14'); // should skip parsing
  });

  it('parses strings that do not match skipParsingFn', () => {
    expect(tryJsonParse('{"a":1}', skipIfNumberString)).toEqual({ a: 1 });
    expect(tryJsonParse('[1,2,3]', skipIfNumberString)).toEqual([1, 2, 3]);
  });
});

describe('deepJsonParse with skipParsingFn', () => {
  const skipIfBooleanString = (value: any) => {
    return (
      typeof value === 'string' &&
      (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')
    );
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

describe('isStringNumber', () => {
  it('identifies numeric strings correctly', () => {
    expect(isStringNumber('42')).toEqual(true);
    expect(isStringNumber('3.14')).toEqual(true);
    expect(isStringNumber('-7')).toEqual(true);
    expect(isStringNumber('0')).toEqual(true);
  });

  it('rejects non-numeric strings', () => {
    expect(isStringNumber('abc')).toEqual(false);
    expect(isStringNumber('')).toEqual(false);
    expect(isStringNumber(' ')).toEqual(false);
    expect(isStringNumber('NaN')).toEqual(false);
    expect(isStringNumber('Infinity')).toEqual(false);
  });

  it('rejects non-string inputs', () => {
    expect(isStringNumber(42)).toEqual(false);
    expect(isStringNumber(true)).toEqual(false);
    expect(isStringNumber(null)).toEqual(false);
    expect(isStringNumber(undefined)).toEqual(false);
    expect(isStringNumber({})).toEqual(false);
  });
});

describe('isStringBoolean', () => {
  it('identifies boolean strings correctly', () => {
    expect(isStringBoolean('true')).toEqual(true);
    expect(isStringBoolean('false')).toEqual(true);
    expect(isStringBoolean('TRUE')).toEqual(true);
    expect(isStringBoolean('FALSE')).toEqual(true);
    expect(isStringBoolean('TrUe')).toEqual(true);
  });

  it('rejects non-boolean strings', () => {
    expect(isStringBoolean('yes')).toEqual(false);
    expect(isStringBoolean('no')).toEqual(false);
    expect(isStringBoolean('1')).toEqual(false);
    expect(isStringBoolean('0')).toEqual(false);
    expect(isStringBoolean('')).toEqual(false);
  });

  it('rejects non-string inputs', () => {
    expect(isStringBoolean(true)).toEqual(false);
    expect(isStringBoolean(false)).toEqual(false);
    expect(isStringBoolean(1)).toEqual(false);
    expect(isStringBoolean(0)).toEqual(false);
    expect(isStringBoolean(null)).toEqual(false);
    expect(isStringBoolean(undefined)).toEqual(false);
    expect(isStringBoolean({})).toEqual(false);
  });
});

describe('isStringNull', () => {
  it('identifies "null" strings correctly', () => {
    expect(isStringNull('null')).toEqual(true);
    expect(isStringNull('NULL')).toEqual(true);
    expect(isStringNull('NuLl')).toEqual(true);
  });

  it('rejects non-"null" strings', () => {
    expect(isStringNull('nil')).toEqual(false);
    expect(isStringNull('undefined')).toEqual(false);
    expect(isStringNull('')).toEqual(false);
    expect(isStringNull(' ')).toEqual(false);
    expect(isStringNull('nulla')).toEqual(false);
  });

  it('rejects non-string inputs', () => {
    expect(isStringNull(null)).toEqual(false);
    expect(isStringNull(undefined)).toEqual(false);
    expect(isStringNull(0)).toEqual(false);
    expect(isStringNull(false)).toEqual(false);
    expect(isStringNull({})).toEqual(false);
  });
});
