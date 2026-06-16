import { describe, expect, it } from 'bun:test';
import ExcelJS from 'exceljs';
import { compare, compareValues, evalGroup } from './conditions';
import { applyStepToWorkbook, type HiddenMask } from './executors';
import { cellToScalar, headerTitles, resolveColumn } from './sheetModel';
import type { AutomationStep } from './types';
import { loadWorkbook, workbookToCsvBytes, workbookToXlsxBytes } from './workbook';

// --- helpers ---------------------------------------------------------------

const makeStep = (s: Partial<AutomationStep> & { type: AutomationStep['type'] }): AutomationStep =>
  ({ id: s.type, enabled: true, ...s }) as AutomationStep;

const wbWith = (sheets: Record<string, unknown[][]>): ExcelJS.Workbook => {
  const wb = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name);
    for (const r of rows) ws.addRow(r);
  }
  return wb;
};

const bodyValues = (ws: ExcelJS.Worksheet, col: number): unknown[] => {
  const out: unknown[] = [];
  for (let r = 2; r <= ws.rowCount; r++) out.push(cellToScalar(ws.getCell(r, col).value));
  return out;
};

// --- comparison system -----------------------------------------------------

describe('comparison system', () => {
  it('numeric and string equality coerce sensibly', () => {
    expect(compare('eq', '5', 5)).toBe(true);
    expect(compare('eq', 'Alice', 'alice')).toBe(true);
    expect(compare('neq', 'a', 'b')).toBe(true);
    expect(compare('gt', 10, 3)).toBe(true);
    expect(compare('lte', 3, 3)).toBe(true);
  });

  it('contains / startsWith are case-insensitive', () => {
    expect(compare('contains', 'Hello World', 'world')).toBe(true);
    expect(compare('startsWith', 'CVE-2024', 'cve')).toBe(true);
    expect(compare('notContains', 'abc', 'z')).toBe(true);
  });

  it('empty checks', () => {
    expect(compare('isEmpty', '', null)).toBe(true);
    expect(compare('isEmpty', '  ', null)).toBe(true);
    expect(compare('notEmpty', 'x', null)).toBe(true);
  });

  it('date comparisons incl. relative tokens', () => {
    expect(compare('dateBefore', '2020-01-01', '2021-01-01')).toBe(true);
    expect(compare('dateAfter', '2099-01-01', 'today')).toBe(true);
    // 1000 days ago is older than 30 days ago
    expect(compare('dateBefore', '-1000d', '-30d')).toBe(true);
  });

  it('date ops are day-granular and reject non-dates (moment-free)', () => {
    // same calendar day, different times → not strictly before/after, but on-or-*
    expect(compare('dateBefore', '2024-03-10T08:00', '2024-03-10T20:00')).toBe(false);
    expect(compare('dateOnOrBefore', '2024-03-10T08:00', '2024-03-10T20:00')).toBe(true);
    expect(compare('dateOnOrAfter', '2024-03-10', '2024-03-10')).toBe(true);
    // year / year-month granularity still parse
    expect(compare('dateAfter', '2025', '2024')).toBe(true);
    expect(compare('dateBefore', '2024-01', '2024-02')).toBe(true);
    // plain text and numbers are never coerced to dates → predicate is false
    expect(compare('dateBefore', 'apple', '2024-01-01')).toBe(false);
    expect(compare('dateBefore', '2024-01-01', 'banana')).toBe(false);
    expect(compare('dateAfter', 20240101, '2024-01-01')).toBe(false);
  });

  it('evalGroup AND / OR', () => {
    const get = (ref: { byHeader?: string } | undefined) => (ref?.byHeader === 'a' ? 5 : 'x');
    expect(evalGroup({ all: [{ column: { byHeader: 'a' }, op: 'gt', value: 1 }] }, get)).toBe(true);
    expect(evalGroup({ all: [{ column: { byHeader: 'a' }, op: 'lt', value: 1 }] }, get)).toBe(false);
    expect(
      evalGroup(
        {
          any: [
            { column: { byHeader: 'a' }, op: 'lt', value: 1 },
            { column: { byHeader: 'a' }, op: 'eq', value: 5 },
          ],
        },
        get,
      ),
    ).toBe(true);
    // empty group matches all
    expect(evalGroup({}, get)).toBe(true);
  });

  it('compareValues orders numbers, dates, strings; blanks last', () => {
    expect(compareValues(2, 10)).toBe(-1);
    expect(compareValues('2020-01-01', '2019-01-01')).toBe(1);
    expect(compareValues('apple', 'banana')).toBe(-1);
    expect(compareValues(null, 5)).toBe(1);
  });
});

// --- workbook IO -----------------------------------------------------------

describe('workbook IO', () => {
  it('loads a CSV into one sheet (no rename crash) and round-trips to xlsx', async () => {
    const wb = await loadWorkbook(new TextEncoder().encode('Name,Age\nAlice,40\nBob,20\n'), 'csv');
    expect(wb.worksheets.length).toBe(1);
    expect(headerTitles(wb.worksheets[0], true)).toEqual(['Name', 'Age']);
    // serialize → reload as xlsx, the uniform storage format for revisions
    const bytes = await workbookToXlsxBytes(wb);
    const reloaded = await loadWorkbook(bytes, 'xlsx');
    expect(headerTitles(reloaded.worksheets[0], true)).toEqual(['Name', 'Age']);
  });
});

// --- sheetModel ------------------------------------------------------------

describe('sheetModel', () => {
  it('resolves columns by header (case-insensitive) and index', () => {
    const headers = ['Name', 'Last Seen', 'Severity'];
    expect(resolveColumn({ byHeader: 'severity' }, headers)).toBe(3);
    expect(resolveColumn({ byIndex: 0 }, headers)).toBe(1);
    expect(resolveColumn({ byHeader: 'missing' }, headers)).toBe(null);
  });

  it('reads header titles', () => {
    const wb = wbWith({
      S: [
        ['A', 'B'],
        [1, 2],
      ],
    });
    expect(headerTitles(wb.worksheets[0], true)).toEqual(['A', 'B']);
  });
});

// --- executors -------------------------------------------------------------

describe('executors', () => {
  it('keepSheet by name removes the others', () => {
    const wb = wbWith({ One: [['a']], Two: [['b']], Three: [['c']] });
    const out = applyStepToWorkbook(wb, {}, makeStep({ type: 'keepSheet', which: { name: 'Two' } }));
    expect(out.sheetsAffected).toBe(2);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Two']);
  });

  it('keepSheet by index, and errors on a missing sheet', () => {
    const wb = wbWith({ One: [['a']], Two: [['b']] });
    applyStepToWorkbook(wb, {}, makeStep({ type: 'keepSheet', which: { index: 0 } }));
    expect(wb.worksheets.map((w) => w.name)).toEqual(['One']);
    expect(() =>
      applyStepToWorkbook(wbWith({ X: [['a']] }), {}, makeStep({ type: 'keepSheet', which: { index: 9 } })),
    ).toThrow();
  });

  it('filterRows delete removes matching rows', () => {
    const wb = wbWith({
      S: [
        ['Name', 'Age'],
        ['Alice', 40],
        ['Bob', 20],
        ['Cara', 50],
      ],
    });
    const out = applyStepToWorkbook(
      wb,
      {},
      makeStep({
        type: 'filterRows',
        hasHeader: true,
        mode: 'delete',
        where: { all: [{ column: { byHeader: 'Age' }, op: 'gt', value: 30 }] },
      }),
    );
    expect(out.rowsAffected).toBe(2); // Alice, Cara
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['Bob']);
  });

  it('filterRows hide records the hidden mask, keeps rows', () => {
    const wb = wbWith({
      S: [
        ['Name', 'Age'],
        ['Alice', 40],
        ['Bob', 20],
      ],
    });
    const mask: HiddenMask = {};
    const out = applyStepToWorkbook(
      wb,
      mask,
      makeStep({
        type: 'filterRows',
        hasHeader: true,
        mode: 'hide',
        where: { all: [{ column: { byHeader: 'Age' }, op: 'gt', value: 30 }] },
      }),
    );
    expect(out.rowsAffected).toBe(1);
    expect(mask.S.rows).toEqual([0]); // body-relative index of Alice
    expect(wb.worksheets[0].getRow(2).hidden).toBe(true);
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['Alice', 'Bob']); // not deleted
  });

  it('empty filter is a no-op (never deletes everything)', () => {
    const wb = wbWith({ S: [['Name'], ['Alice'], ['Bob']] });
    const out = applyStepToWorkbook(
      wb,
      {},
      makeStep({ type: 'filterRows', hasHeader: true, mode: 'delete', where: {} }),
    );
    expect(out.rowsAffected).toBe(0);
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['Alice', 'Bob']);
  });

  it('filterRows keep:matching shows the matched rows and drops the rest', () => {
    const wb = wbWith({
      S: [
        ['Name', 'Age'],
        ['Alice', 40],
        ['Bob', 20],
        ['Cara', 50],
      ],
    });
    const out = applyStepToWorkbook(
      wb,
      {},
      makeStep({
        type: 'filterRows',
        hasHeader: true,
        keep: 'matching',
        mode: 'delete',
        where: { all: [{ column: { byHeader: 'Age' }, op: 'gt', value: 30 }] },
      }),
    );
    expect(out.rowsAffected).toBe(1); // only Bob is dropped
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['Alice', 'Cara']);
  });

  it('filterRows keep:matching with hide masks the non-matching rows', () => {
    const wb = wbWith({
      S: [
        ['Name', 'Age'],
        ['Alice', 40],
        ['Bob', 20],
      ],
    });
    const mask: HiddenMask = {};
    const out = applyStepToWorkbook(
      wb,
      mask,
      makeStep({
        type: 'filterRows',
        hasHeader: true,
        keep: 'matching',
        mode: 'hide',
        where: { all: [{ column: { byHeader: 'Age' }, op: 'gt', value: 30 }] },
      }),
    );
    expect(out.rowsAffected).toBe(1);
    expect(mask.S.rows).toEqual([1]); // body-relative index of Bob (the non-match)
    expect(wb.worksheets[0].getRow(3).hidden).toBe(true);
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['Alice', 'Bob']); // not deleted
  });

  it('limitRows delete keeps the first N data rows', () => {
    const wb = wbWith({ S: [['Name'], ['A'], ['B'], ['C'], ['D']] });
    const out = applyStepToWorkbook(wb, {}, makeStep({ type: 'limitRows', hasHeader: true, mode: 'delete', count: 2 }));
    expect(out.rowsAffected).toBe(2); // C, D dropped
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['A', 'B']);
  });

  it('limitRows hide masks the rows past the limit', () => {
    const wb = wbWith({ S: [['Name'], ['A'], ['B'], ['C']] });
    const mask: HiddenMask = {};
    const out = applyStepToWorkbook(wb, mask, makeStep({ type: 'limitRows', hasHeader: true, mode: 'hide', count: 1 }));
    expect(out.rowsAffected).toBe(2); // B, C hidden
    expect(mask.S.rows).toEqual([1, 2]);
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['A', 'B', 'C']); // not deleted
  });

  it('renameColumn renames a header by name', () => {
    const wb = wbWith({
      S: [
        ['Name', 'Age'],
        ['Alice', 40],
      ],
    });
    const out = applyStepToWorkbook(
      wb,
      {},
      makeStep({ type: 'renameColumn', column: { byHeader: 'Age' }, to: 'Years' }),
    );
    expect(out.colsAffected).toBe(1);
    expect(cellToScalar(wb.worksheets[0].getCell(1, 2).value)).toBe('Years');
  });

  it('workbookToCsvBytes serializes visible rows and drops hidden ones', () => {
    const wb = wbWith({ S: [['Name'], ['A'], ['B'], ['C']] });
    applyStepToWorkbook(wb, {}, makeStep({ type: 'limitRows', hasHeader: true, mode: 'hide', count: 1 }));
    const csv = new TextDecoder().decode(workbookToCsvBytes(wb));
    expect(csv).toBe('Name\nA\n');
  });

  it('sortRows by a column, descending', () => {
    const wb = wbWith({
      S: [
        ['Name', 'Sev'],
        ['Low', 1],
        ['High', 9],
        ['Mid', 5],
      ],
    });
    applyStepToWorkbook(
      wb,
      {},
      makeStep({
        type: 'sortRows',
        hasHeader: true,
        by: [{ column: { byHeader: 'Sev' }, dir: 'desc' }],
      }),
    );
    expect(bodyValues(wb.worksheets[0], 1)).toEqual(['High', 'Mid', 'Low']);
  });

  it('filterColumns delete drops named columns', () => {
    const wb = wbWith({
      S: [
        ['A', 'B', 'C'],
        [1, 2, 3],
      ],
    });
    const out = applyStepToWorkbook(
      wb,
      {},
      makeStep({ type: 'filterColumns', mode: 'delete', drop: [{ byHeader: 'B' }] }),
    );
    expect(out.colsAffected).toBe(1);
    expect(headerTitles(wb.worksheets[0], true)).toEqual(['A', 'C']);
  });

  it('filterColumns keep drops everything else', () => {
    const wb = wbWith({
      S: [
        ['A', 'B', 'C'],
        [1, 2, 3],
      ],
    });
    applyStepToWorkbook(
      wb,
      {},
      makeStep({ type: 'filterColumns', mode: 'delete', keep: [{ byHeader: 'A' }, { byHeader: 'C' }] }),
    );
    expect(headerTitles(wb.worksheets[0], true)).toEqual(['A', 'C']);
  });

  it('addColumn appends a header + initial value', () => {
    const wb = wbWith({ S: [['A'], [1], [2]] });
    applyStepToWorkbook(wb, {}, makeStep({ type: 'addColumn', header: 'Needs Review', initialValue: false }));
    const ws = wb.worksheets[0];
    expect(cellToScalar(ws.getCell(1, 2).value)).toBe('Needs Review');
    expect(bodyValues(ws, 2)).toEqual([false, false]);
  });

  it('fillColumn derived rules set values by comparison', () => {
    const wb = wbWith({
      S: [
        ['Last Seen', 'Needs Review'],
        ['2019-01-01', ''],
        ['2099-01-01', ''],
      ],
    });
    applyStepToWorkbook(
      wb,
      {},
      makeStep({
        type: 'fillColumn',
        hasHeader: true,
        target: { byHeader: 'Needs Review' },
        rules: [
          {
            when: { all: [{ column: { byHeader: 'Last Seen' }, op: 'dateBefore', value: 'today' }] },
            set: true,
          },
        ],
        elseValue: false,
      }),
    );
    expect(bodyValues(wb.worksheets[0], 2)).toEqual([true, false]);
  });

  it('fillColumn per-row formula computes and adjusts references', () => {
    const wb = wbWith({
      S: [
        ['Qty', 'Price', 'Total'],
        [2, 10, ''],
        [3, 5, ''],
      ],
    });
    applyStepToWorkbook(
      wb,
      {},
      makeStep({
        type: 'fillColumn',
        hasHeader: true,
        target: { byHeader: 'Total' },
        formula: '=A2*B2',
        formulaPerRow: true,
      }),
    );
    const ws = wb.worksheets[0];
    // stored as formula cells with cached results
    const c2 = ws.getCell(2, 3).value as { formula?: string; result?: unknown };
    expect(c2.formula).toBe('A2*B2');
    expect(c2.result).toBe(20);
    const c3 = ws.getCell(3, 3).value as { formula?: string; result?: unknown };
    expect(c3.formula).toBe('A3*B3');
    expect(c3.result).toBe(15);
  });

  it('fillColumn aggregate formula fills only the first data row', () => {
    const wb = wbWith({
      S: [
        ['V', 'Sum'],
        [2, ''],
        [3, ''],
        [5, ''],
      ],
    });
    applyStepToWorkbook(
      wb,
      {},
      makeStep({
        type: 'fillColumn',
        hasHeader: true,
        target: { byHeader: 'Sum' },
        formula: '=SUM(A2:A4)',
        formulaPerRow: false,
      }),
    );
    const ws = wb.worksheets[0];
    const c2 = ws.getCell(2, 2).value as { result?: unknown };
    expect(c2.result).toBe(10);
    expect(ws.getCell(3, 2).value).toBeFalsy();
  });

  it('manualEdit sets cells at absolute 0-based coords', () => {
    const wb = wbWith({
      Data: [
        ['A', 'B'],
        [1, 2],
      ],
    });
    applyStepToWorkbook(
      wb,
      {},
      makeStep({ type: 'manualEdit', sheet: 'Data', edits: [{ row: 1, col: 0, value: 99 }] }),
    );
    expect(cellToScalar(wb.worksheets[0].getCell(2, 1).value)).toBe(99);
  });
});

// --- the spec's end-to-end scenario ---------------------------------------

describe('vulnerability report scenario', () => {
  it('keep one sheet → delete old rows → sort → drop column → add+fill review flag', () => {
    const wb = wbWith({
      Summary: [['ignore me']],
      'Manager A': [
        ['CVE', 'Last Seen', 'Severity', 'Internal Note'],
        ['CVE-2019-1', '2019-01-01', 7, 'x'],
        ['CVE-2024-2', '2099-01-01', 9, 'y'],
        ['CVE-2018-3', '2018-06-01', 3, 'z'],
      ],
      'Manager B': [['other']],
    });
    const mask: HiddenMask = {};
    const steps: AutomationStep[] = [
      makeStep({ type: 'keepSheet', which: { name: 'Manager A' } }),
      makeStep({
        type: 'filterRows',
        hasHeader: true,
        mode: 'delete',
        where: { all: [{ column: { byHeader: 'Last Seen' }, op: 'dateBefore', value: '2020-01-01' }] },
      }),
      makeStep({
        type: 'sortRows',
        hasHeader: true,
        by: [{ column: { byHeader: 'Severity' }, dir: 'desc' }],
      }),
      makeStep({ type: 'filterColumns', mode: 'delete', drop: [{ byHeader: 'Internal Note' }] }),
      makeStep({ type: 'addColumn', header: 'Needs Review', initialValue: false }),
      makeStep({
        type: 'fillColumn',
        hasHeader: true,
        target: { byHeader: 'Needs Review' },
        rules: [{ when: { all: [{ column: { byHeader: 'Severity' }, op: 'gte', value: 8 }] }, set: true }],
        elseValue: false,
      }),
    ];
    for (const s of steps) applyStepToWorkbook(wb, mask, s);

    expect(wb.worksheets.map((w) => w.name)).toEqual(['Manager A']);
    const ws = wb.worksheets[0];
    // only the 2099 row survived the date filter
    expect(bodyValues(ws, 1)).toEqual(['CVE-2024-2']);
    // Internal Note column dropped, Needs Review added
    expect(headerTitles(ws, true)).toEqual(['CVE', 'Last Seen', 'Severity', 'Needs Review']);
    // severity 9 >= 8 → true
    expect(bodyValues(ws, 4)).toEqual([true]);
  });
});
