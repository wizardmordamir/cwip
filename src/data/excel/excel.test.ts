import { describe, expect, it } from 'bun:test';
import { readSheet, readWorkbook, writeWorkbook } from '.';

describe('excel round-trip', () => {
  it('writes rows to a buffer and reads them back', () => {
    const rows = [
      { name: 'Ada', age: 36 },
      { name: 'Bo', age: 9 },
    ];
    const buf = writeWorkbook(rows, { sheetName: 'People' });
    expect(buf.length).toBeGreaterThan(0);

    expect(readSheet(buf, { sheet: 'People' })).toEqual(rows);
    expect(readSheet(buf)).toEqual(rows); // first sheet by default
  });

  it('writes and reads multiple sheets in order', () => {
    const buf = writeWorkbook({ Users: [{ id: 1 }], Orders: [{ id: 2, total: 9.5 }] });
    const wb = readWorkbook(buf);
    expect(Object.keys(wb)).toEqual(['Users', 'Orders']);
    expect(wb.Users).toEqual([{ id: 1 }]);
    expect(wb.Orders).toEqual([{ id: 2, total: 9.5 }]);
  });

  it('returns [] for a missing sheet name', () => {
    const buf = writeWorkbook([{ a: 1 }]);
    expect(readSheet(buf, { sheet: 'Nope' })).toEqual([]);
  });
});
