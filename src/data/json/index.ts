/**
 * JSON / CSV conversions — pure, browser-safe, no DOM/Node deps. The shared core
 * behind the apps' "JSON tools" and JSON/JS editors (cwip/react `JsonEditor`).
 *
 * `formatJson` is a tolerant JSON / JS-object formatter: it parses input that may
 * use JS-isms (single quotes, unquoted keys, trailing commas, `//` and block
 * comments, `undefined` / `NaN` / `Infinity`) into a value tree, then re-serializes
 * it either as strict JSON (double quotes, quoted keys) or as a tidy JS object
 * literal. Objects are kept as Maps so key order — including numeric-looking keys —
 * is preserved exactly as written, and parse errors report line/column.
 *
 * `parseLoose` exposes the same tolerant parse as a plain JS value tree (for
 * callers that want the data, e.g. validating a pasted object or JSON→CSV).
 *
 * `csvToJson` / `jsonToCsv` convert between CSV and JSON. The CSV parser is
 * RFC-4180-ish: quoted fields, escaped quotes (`""`), newlines inside quoted
 * fields, a leading UTF-8 BOM stripped, and CRLF normalized to a single row break.
 * The JSON side reuses the tolerant parser (`parseLoose`), so JSON→CSV accepts
 * loose JS object literals as well as strict JSON.
 */

export interface JsonFormatOptions {
  /** true → emit valid JSON; false → emit a nicely-formatted JS object literal. */
  strictOutput: boolean;
  indent: number;
}

export interface JsonFormatResult {
  ok: boolean;
  output: string;
  error?: string;
  errorLine?: number;
  errorCol?: number;
}

// Distinct sentinels so JS-only literals survive a round-trip in non-strict mode.
const UNDEF = Symbol('undefined');
const NAN = Symbol('NaN');
const POS_INF = Symbol('Infinity');
const NEG_INF = Symbol('-Infinity');

type Value =
  | Map<string, Value>
  | Value[]
  | string
  | number
  | boolean
  | null
  | typeof UNDEF
  | typeof NAN
  | typeof POS_INF
  | typeof NEG_INF;

// Objects/arrays whose input ended with a trailing comma. Trailing commas are
// valid in JS object literals, so non-strict output re-emits them here.
const hadTrailingComma = new WeakSet<object>();

class ParseError extends Error {
  constructor(
    message: string,
    public index: number,
  ) {
    super(message);
  }
}

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  parse(): Value {
    this.skipWs();
    const v = this.parseValue();
    this.skipWs();
    if (this.i < this.s.length) throw new ParseError('Unexpected trailing content', this.i);
    return v;
  }

  private err(msg: string): never {
    throw new ParseError(msg, this.i);
  }

  private peek(): string {
    return this.s[this.i] ?? '';
  }

  private skipWs(): void {
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.i++;
      } else if (c === '/' && this.s[this.i + 1] === '/') {
        const nl = this.s.indexOf('\n', this.i);
        this.i = nl === -1 ? this.s.length : nl;
      } else if (c === '/' && this.s[this.i + 1] === '*') {
        const end = this.s.indexOf('*/', this.i + 2);
        this.i = end === -1 ? this.s.length : end + 2;
      } else {
        break;
      }
    }
  }

  private parseValue(): Value {
    this.skipWs();
    const c = this.peek();
    if (c === '{') return this.parseObject();
    if (c === '[') return this.parseArray();
    if (c === '"' || c === "'" || c === '`') return this.parseString(c);
    if (c === '') this.err('Unexpected end of input');
    return this.parseLiteral();
  }

  private parseObject(): Map<string, Value> {
    this.i++; // consume '{'
    const map = new Map<string, Value>();
    this.skipWs();
    if (this.peek() === '}') {
      this.i++;
      return map;
    }
    for (;;) {
      this.skipWs();
      const c = this.peek();
      const key = c === '"' || c === "'" || c === '`' ? this.parseString(c) : this.parseIdentifier();
      this.skipWs();
      if (this.peek() !== ':') this.err(`Expected ":" after key "${key}"`);
      this.i++; // consume ':'
      map.set(key, this.parseValue());
      this.skipWs();
      if (this.peek() === ',') {
        this.i++;
        this.skipWs();
        if (this.peek() === '}') {
          this.i++;
          hadTrailingComma.add(map);
          return map;
        } // trailing comma
      } else if (this.peek() === '}') {
        this.i++;
        return map;
      } else {
        this.err('Expected "," or "}" in object');
      }
    }
  }

  private parseArray(): Value[] {
    this.i++; // consume '['
    const arr: Value[] = [];
    this.skipWs();
    if (this.peek() === ']') {
      this.i++;
      return arr;
    }
    for (;;) {
      arr.push(this.parseValue());
      this.skipWs();
      if (this.peek() === ',') {
        this.i++;
        this.skipWs();
        if (this.peek() === ']') {
          this.i++;
          hadTrailingComma.add(arr);
          return arr;
        } // trailing comma
      } else if (this.peek() === ']') {
        this.i++;
        return arr;
      } else {
        this.err('Expected "," or "]" in array');
      }
    }
  }

  private parseString(quote: string): string {
    this.i++; // consume opening quote
    let out = '';
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === '\\') {
        const next = this.s[this.i + 1];
        const map: Record<string, string> = {
          n: '\n',
          t: '\t',
          r: '\r',
          b: '\b',
          f: '\f',
          v: '\v',
          '0': '\0',
        };
        if (next === 'u') {
          out += String.fromCharCode(Number.parseInt(this.s.slice(this.i + 2, this.i + 6), 16));
          this.i += 6;
          continue;
        }
        out += map[next] ?? next;
        this.i += 2;
        continue;
      }
      if (c === quote) {
        this.i++;
        return out;
      }
      out += c;
      this.i++;
    }
    this.err('Unterminated string');
  }

  private parseIdentifier(): string {
    const start = this.i;
    while (this.i < this.s.length && /[A-Za-z0-9_$]/.test(this.s[this.i])) this.i++;
    if (this.i === start) this.err('Expected a property name');
    return this.s.slice(start, this.i);
  }

  private parseLiteral(): Value {
    const start = this.i;
    while (this.i < this.s.length && /[-+0-9a-zA-Z.eE]/.test(this.s[this.i])) this.i++;
    const tok = this.s.slice(start, this.i);
    switch (tok) {
      case 'true':
        return true;
      case 'false':
        return false;
      case 'null':
        return null;
      case 'undefined':
        return UNDEF;
      case 'NaN':
        return NAN;
      case 'Infinity':
        return POS_INF;
      case '-Infinity':
        return NEG_INF;
    }
    const n = Number(tok);
    if (tok === '' || Number.isNaN(n)) this.err(`Unexpected token "${tok || this.peek()}"`);
    return n;
  }
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const singleQuote = (s: string): string =>
  `'${s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}'`;

const serialize = (val: Value, opts: JsonFormatOptions, depth: number): string => {
  const pad = ' '.repeat(opts.indent * (depth + 1));
  const closePad = ' '.repeat(opts.indent * depth);

  if (val === UNDEF) return opts.strictOutput ? 'null' : 'undefined';
  if (val === NAN) return opts.strictOutput ? 'null' : 'NaN';
  if (val === POS_INF) return opts.strictOutput ? 'null' : 'Infinity';
  if (val === NEG_INF) return opts.strictOutput ? 'null' : '-Infinity';
  if (val === null) return 'null';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  if (typeof val === 'string') return opts.strictOutput ? JSON.stringify(val) : singleQuote(val);

  // A trailing comma from the input is valid in JS object literals, so keep it
  // when emitting a JS object literal (non-strict); strict JSON never allows it.
  const trail = !opts.strictOutput && hadTrailingComma.has(val) ? ',' : '';

  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.map((v) => pad + serialize(v, opts, depth + 1));
    return `[\n${items.join(',\n')}${trail}\n${closePad}]`;
  }

  // Map (object)
  if (val.size === 0) return '{}';
  const entries = [...val.entries()].map(([k, v]) => {
    const key = opts.strictOutput ? JSON.stringify(k) : IDENT.test(k) ? k : singleQuote(k);
    return `${pad}${key}: ${serialize(v, opts, depth + 1)}`;
  });
  return `{\n${entries.join(',\n')}${trail}\n${closePad}}`;
};

// Map a ParseError (or any error) onto the shared {error, line, col} result shape.
const describeError = (input: string, err: unknown) => {
  if (err instanceof ParseError) {
    const before = input.slice(0, err.index);
    const line = before.split('\n').length;
    const col = err.index - before.lastIndexOf('\n');
    return { error: err.message, errorLine: line, errorCol: col };
  }
  return { error: err instanceof Error ? err.message : 'Parse error' };
};

export const formatJson = (input: string, opts: JsonFormatOptions): JsonFormatResult => {
  if (!input.trim()) return { ok: true, output: '' };
  try {
    const value = new Parser(input).parse();
    return { ok: true, output: serialize(value, opts, 0) };
  } catch (err) {
    return { ok: false, output: '', ...describeError(input, err) };
  }
};

// Collapse the internal Value tree (Maps + JS-literal sentinels) into plain JS
// values, so callers that just want the data — e.g. JSON→CSV — get real objects.
const toPlain = (val: Value): unknown => {
  if (val === UNDEF) return undefined;
  if (val === NAN) return Number.NaN;
  if (val === POS_INF) return Number.POSITIVE_INFINITY;
  if (val === NEG_INF) return Number.NEGATIVE_INFINITY;
  if (Array.isArray(val)) return val.map(toPlain);
  if (val instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of val) obj[k] = toPlain(v);
    return obj;
  }
  return val;
};

export interface LooseParseResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  errorLine?: number;
  errorCol?: number;
}

/** Parse JSON or a loose JS object literal into a plain JS value tree. */
export const parseLoose = (input: string): LooseParseResult => {
  if (!input.trim()) return { ok: true, value: undefined };
  try {
    return { ok: true, value: toPlain(new Parser(input).parse()) };
  } catch (err) {
    return { ok: false, ...describeError(input, err) };
  }
};

// ── CSV ⇄ JSON ───────────────────────────────────────────────────────────────

export interface CsvFormatResult {
  ok: boolean;
  output: string;
  error?: string;
  errorLine?: number;
}

export interface CsvToJsonOptions {
  delimiter: string;
  hasHeader: boolean;
  indent: number;
}

export interface JsonToCsvOptions {
  delimiter: string;
}

/** Parse CSV text into a grid of string cells. Throws on a malformed field. */
export const parseCsv = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  // Strip a leading UTF-8 BOM so the first header cell isn't polluted.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      endField();
      i++;
      continue;
    }
    if (c === '\r') {
      // Swallow CRLF as a single row break.
      if (text[i + 1] === '\n') i++;
      endRow();
      i++;
      continue;
    }
    if (c === '\n') {
      endRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }

  if (inQuotes) throw new Error('Unterminated quoted field');

  // Flush the final field/row unless the input ended on a clean row break.
  if (field !== '' || row.length > 0) endRow();

  return rows;
};

const looksNumeric = (s: string): boolean => s !== '' && s.trim() !== '' && !Number.isNaN(Number(s));

// Coerce a raw CSV cell to the most natural JSON value.
const cellToJson = (raw: string): string | number | boolean | null => {
  if (raw === '') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (looksNumeric(raw)) return Number(raw);
  return raw;
};

export const csvToJson = (input: string, opts: CsvToJsonOptions): CsvFormatResult => {
  if (!input.trim()) return { ok: true, output: '' };
  try {
    const grid = parseCsv(input, opts.delimiter);
    if (grid.length === 0) return { ok: true, output: '[]' };

    let value: unknown;
    if (opts.hasHeader) {
      const [header, ...body] = grid;
      value = body.map((cells) => {
        const obj: Record<string, unknown> = {};
        header.forEach((key, idx) => {
          obj[key] = cellToJson(cells[idx] ?? '');
        });
        return obj;
      });
    } else {
      value = grid.map((cells) => cells.map(cellToJson));
    }

    return { ok: true, output: JSON.stringify(value, null, opts.indent) };
  } catch (err) {
    return { ok: false, output: '', error: err instanceof Error ? err.message : 'Parse error' };
  }
};

// Quote a CSV field only when it contains the delimiter, a quote, or a newline.
const escapeCsv = (value: string, delimiter: string): string => {
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const cellFromJson = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export const jsonToCsv = (input: string, opts: JsonToCsvOptions): CsvFormatResult => {
  if (!input.trim()) return { ok: true, output: '' };

  // Accept loose JS object literals (single quotes, unquoted keys, trailing
  // commas, comments), not just strict JSON.
  const parsed = parseLoose(input);
  if (!parsed.ok) {
    return { ok: false, output: '', error: parsed.error, errorLine: parsed.errorLine };
  }
  const data = parsed.value;

  if (!Array.isArray(data)) {
    return { ok: false, output: '', error: 'Expected a JSON array of rows or objects' };
  }
  if (data.length === 0) return { ok: true, output: '' };

  const { delimiter } = opts;
  const allObjects = data.every((r) => r !== null && typeof r === 'object' && !Array.isArray(r));

  let lines: string[];
  if (allObjects) {
    // Union of keys across every row, preserving first-seen order.
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const row of data as Record<string, unknown>[]) {
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }
    lines = [keys.map((k) => escapeCsv(k, delimiter)).join(delimiter)];
    for (const row of data as Record<string, unknown>[]) {
      lines.push(keys.map((k) => escapeCsv(cellFromJson(row[k]), delimiter)).join(delimiter));
    }
  } else {
    // Array-of-arrays (or mixed/scalar rows) → one row per element, no header.
    lines = (data as unknown[]).map((row) => {
      const cells = Array.isArray(row) ? row : [row];
      return cells.map((c) => escapeCsv(cellFromJson(c), delimiter)).join(delimiter);
    });
  }

  return { ok: true, output: lines.join('\n') };
};
