import { describe, expect, test } from 'bun:test';
import { csvToJson, formatJson, jsonToCsv, parseLoose } from './index';

const strict = { strictOutput: true, indent: 2 };
const loose = { strictOutput: false, indent: 2 };

describe('formatJson', () => {
  test('formats valid JSON as strict JSON', () => {
    const r = formatJson('{"a":1,"b":[2,3]}', strict);
    expect(r.ok).toBe(true);
    expect(r.output).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  test('empty input is ok with empty output', () => {
    expect(formatJson('   ', strict)).toEqual({ ok: true, output: '' });
  });

  test('preserves key order exactly', () => {
    const r = formatJson('{ b: 1, a: 2, 10: 3, 2: 4 }', strict);
    expect(r.output).toBe('{\n  "b": 1,\n  "a": 2,\n  "10": 3,\n  "2": 4\n}');
  });

  test('tolerant: trailing comma', () => {
    const r = formatJson('[1, 2, 3,]', strict);
    expect(r.ok).toBe(true);
    expect(r.output).toBe('[\n  1,\n  2,\n  3\n]');
  });

  test('tolerant: trailing comma re-emitted in non-strict output', () => {
    const r = formatJson('[1, 2, 3,]', loose);
    expect(r.output).toBe('[\n  1,\n  2,\n  3,\n]');
  });

  test('tolerant: line and block comments', () => {
    const input = `{
      // a leading comment
      a: 1, /* inline */ b: 2
    }`;
    const r = formatJson(input, strict);
    expect(r.ok).toBe(true);
    expect(r.output).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  test('tolerant: unquoted keys', () => {
    const r = formatJson('{ foo: 1, bar_baz: 2 }', strict);
    expect(r.output).toBe('{\n  "foo": 1,\n  "bar_baz": 2\n}');
  });

  test('tolerant: single-quoted strings', () => {
    const r = formatJson("{ a: 'hi there' }", strict);
    expect(r.output).toBe('{\n  "a": "hi there"\n}');
  });

  test('tolerant: JS literals collapse to null in strict, survive in non-strict', () => {
    const input = '{ a: undefined, b: NaN, c: Infinity, d: -Infinity }';
    expect(formatJson(input, strict).output).toBe('{\n  "a": null,\n  "b": null,\n  "c": null,\n  "d": null\n}');
    expect(formatJson(input, loose).output).toBe('{\n  a: undefined,\n  b: NaN,\n  c: Infinity,\n  d: -Infinity\n}');
  });

  test('error reports line and column', () => {
    const r = formatJson('{\n  "a": 1\n  "b": 2\n}', strict);
    expect(r.ok).toBe(false);
    expect(r.errorLine).toBe(3);
    expect(typeof r.errorCol).toBe('number');
    expect(r.errorCol).toBeGreaterThan(0);
    expect(r.error).toBeTruthy();
  });
});

describe('parseLoose', () => {
  test('empty input is ok with undefined value', () => {
    expect(parseLoose('   ')).toEqual({ ok: true, value: undefined });
  });

  test('parses a loose JS object into a plain value', () => {
    const r = parseLoose("{ a: 1, b: 'two', c: [1, 2,], }");
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1, b: 'two', c: [1, 2] });
  });

  test('keeps backtick strings literal (no interpolation)', () => {
    const r = parseLoose('{ p: `${homedir()}/.zshrc` }');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ p: '${homedir()}/.zshrc' });
  });

  test('reports an error with line/col on bad input', () => {
    const r = parseLoose('{ a: }');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
});

describe('csvToJson', () => {
  test('header rows become objects with coerced cells', () => {
    const r = csvToJson('name,age,active\nAda,36,true\nGrace,,false', {
      delimiter: ',',
      hasHeader: true,
      indent: 2,
    });
    expect(r.ok).toBe(true);
    expect(JSON.parse(r.output)).toEqual([
      { name: 'Ada', age: 36, active: true },
      { name: 'Grace', age: null, active: false },
    ]);
  });

  test('no header → array of arrays', () => {
    const r = csvToJson('1,2\n3,4', { delimiter: ',', hasHeader: false, indent: 2 });
    expect(JSON.parse(r.output)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  test('quoted field with embedded comma and newline', () => {
    const r = csvToJson('a,b\n"x, y","line1\nline2"', { delimiter: ',', hasHeader: true, indent: 2 });
    expect(JSON.parse(r.output)).toEqual([{ a: 'x, y', b: 'line1\nline2' }]);
  });

  test('escaped quotes inside quoted field', () => {
    const r = csvToJson('q\n"she said ""hi"""', { delimiter: ',', hasHeader: true, indent: 2 });
    expect(JSON.parse(r.output)).toEqual([{ q: 'she said "hi"' }]);
  });

  test('strips BOM and normalizes CRLF', () => {
    const r = csvToJson('﻿name,age\r\nAda,36\r\n', {
      delimiter: ',',
      hasHeader: true,
      indent: 2,
    });
    expect(JSON.parse(r.output)).toEqual([{ name: 'Ada', age: 36 }]);
  });

  test('unterminated quoted field errors', () => {
    const r = csvToJson('a,b\n"oops', { delimiter: ',', hasHeader: true, indent: 2 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Unterminated');
  });

  test('round-trips with jsonToCsv', () => {
    const csv = 'name,age\nAda,36\nGrace,37';
    const json = csvToJson(csv, { delimiter: ',', hasHeader: true, indent: 2 });
    const back = jsonToCsv(json.output, { delimiter: ',' });
    expect(back.output).toBe(csv);
  });
});

describe('jsonToCsv', () => {
  test('array of objects → header + rows, union of keys', () => {
    const r = jsonToCsv('[{"a":1,"b":2},{"a":3,"c":4}]', { delimiter: ',' });
    expect(r.ok).toBe(true);
    expect(r.output).toBe('a,b,c\n1,2,\n3,,4');
  });

  test('quotes fields containing the delimiter, quotes, or newlines', () => {
    const r = jsonToCsv('[{"x":"a, b","y":"he said \\"hi\\"","z":"line1\\nline2"}]', { delimiter: ',' });
    expect(r.output).toBe('x,y,z\n"a, b","he said ""hi""","line1\nline2"');
  });

  test('array of arrays → no header', () => {
    const r = jsonToCsv('[[1,2],[3,4]]', { delimiter: ',' });
    expect(r.output).toBe('1,2\n3,4');
  });

  test('accepts loose JS object literals', () => {
    const r = jsonToCsv("[{ a: 1, b: 'two' }]", { delimiter: ',' });
    expect(r.output).toBe('a,b\n1,two');
  });

  test('non-array input errors', () => {
    const r = jsonToCsv('{"a":1}', { delimiter: ',' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('array');
  });

  test('empty array → empty output', () => {
    expect(jsonToCsv('[]', { delimiter: ',' })).toEqual({ ok: true, output: '' });
  });
});
