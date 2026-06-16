import { describe, expect, it } from 'bun:test';
import { parseCsv, serializeCsv } from './csv';

describe('parseCsv', () => {
  it('parses a header + rows', () => {
    expect(parseCsv('a,b,c\n1,2,3\n4,5,6')).toEqual({
      columns: ['a', 'b', 'c'],
      rows: [
        ['1', '2', '3'],
        ['4', '5', '6'],
      ],
    });
  });

  it('handles quoted fields with commas, quotes, and newlines', () => {
    const t = parseCsv('name,note\n"Smith, Jane","line1\nline2"\n"a ""quote""",plain');
    expect(t.columns).toEqual(['name', 'note']);
    expect(t.rows[0]).toEqual(['Smith, Jane', 'line1\nline2']);
    expect(t.rows[1]).toEqual(['a "quote"', 'plain']);
  });

  it('normalizes CRLF and pads ragged rows to header width', () => {
    const t = parseCsv('a,b,c\r\n1,2\r\n');
    expect(t.rows).toEqual([['1', '2', '']]);
  });

  it('ignores a clean trailing newline (no phantom empty row)', () => {
    expect(parseCsv('a\n1\n').rows).toEqual([['1']]);
  });

  it('returns empty columns/rows for empty input', () => {
    expect(parseCsv('')).toEqual({ columns: [], rows: [] });
  });
});

describe('serializeCsv', () => {
  it('quotes only cells that need it and adds a trailing newline', () => {
    const csv = serializeCsv({
      columns: ['name', 'note'],
      rows: [['Smith, Jane', 'a "quote"\nx']],
    });
    expect(csv).toBe('name,note\n"Smith, Jane","a ""quote""\nx"\n');
  });

  it('round-trips through parseCsv', () => {
    const table = {
      columns: ['a', 'b'],
      rows: [
        ['1', 'has,comma'],
        ['line\nbreak', 'q"q'],
      ],
    };
    expect(parseCsv(serializeCsv(table))).toEqual(table);
  });
});
