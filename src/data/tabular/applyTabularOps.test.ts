import { describe, expect, it } from 'bun:test';
import { type AiComplete, applyTabularOps, parseAiTable, parseCsv, serializeCsv, type TabularTable } from '.';

const T: TabularTable = {
  columns: ['name', 'qty', 'city'],
  rows: [
    ['apple', '10', 'NYC'],
    ['banana', '3', 'LA'],
    ['cherry', '20', 'NYC'],
  ],
};

describe('csv', () => {
  it('parseCsv handles quotes, embedded commas and newlines', () => {
    const t = parseCsv('a,b\n"x,y","line\n2"\nplain,"he said ""hi"""\n');
    expect(t.columns).toEqual(['a', 'b']);
    expect(t.rows).toEqual([
      ['x,y', 'line\n2'],
      ['plain', 'he said "hi"'],
    ]);
  });

  it('parseCsv normalizes ragged rows to header width', () => {
    expect(parseCsv('a,b,c\n1,2\n').rows).toEqual([['1', '2', '']]);
  });

  it('serializeCsv round-trips and quotes when needed', () => {
    expect(parseCsv(serializeCsv(T))).toEqual(T);
    expect(serializeCsv({ columns: ['x'], rows: [['a,b']] })).toBe('x\n"a,b"\n');
  });
});

describe('ops', () => {
  it('select keeps and reorders columns', async () => {
    const r = await applyTabularOps(T, [{ op: 'select', columns: ['city', 'name'] }]);
    expect(r.columns).toEqual(['city', 'name']);
    expect(r.rows[0]).toEqual(['NYC', 'apple']);
  });

  it('rename relabels columns', async () => {
    const r = await applyTabularOps(T, [{ op: 'rename', rename: { qty: 'quantity' } }]);
    expect(r.columns).toEqual(['name', 'quantity', 'city']);
  });

  it('filter compares numerically when both sides are numbers', async () => {
    const r = await applyTabularOps(T, [{ op: 'filter', column: 'qty', compare: 'gte', value: '10' }]);
    expect(r.rows.map((row) => row[0])).toEqual(['apple', 'cherry']);
  });

  it('filter in/notIn keeps/drops rows whose cell is (case-insensitively) in the values list', async () => {
    const keep = await applyTabularOps(T, [
      { op: 'filter', column: 'name', compare: 'in', values: ['APPLE', 'cherry'] },
    ]);
    expect(keep.rows.map((row) => row[0])).toEqual(['apple', 'cherry']);

    const drop = await applyTabularOps(T, [{ op: 'filter', column: 'city', compare: 'notIn', values: ['LA'] }]);
    expect(drop.rows.map((row) => row[0])).toEqual(['apple', 'cherry']);

    // empty/missing values list: `in` matches nothing, `notIn` matches everything.
    expect((await applyTabularOps(T, [{ op: 'filter', column: 'name', compare: 'in', values: [] }])).rows).toHaveLength(
      0,
    );
    expect((await applyTabularOps(T, [{ op: 'filter', column: 'name', compare: 'notIn' }])).rows).toHaveLength(3);
  });

  it('sort is numeric-aware and respects direction', async () => {
    const asc = await applyTabularOps(T, [{ op: 'sort', column: 'qty' }]);
    expect(asc.rows.map((r) => r[1])).toEqual(['3', '10', '20']);
    const desc = await applyTabularOps(T, [{ op: 'sort', column: 'qty', dir: 'desc' }]);
    expect(desc.rows.map((r) => r[1])).toEqual(['20', '10', '3']);
  });

  it('limit truncates rows; ops compose in order', async () => {
    const r = await applyTabularOps(T, [
      { op: 'filter', column: 'city', compare: 'eq', value: 'NYC' },
      { op: 'sort', column: 'qty', dir: 'desc' },
      { op: 'limit', count: 1 },
    ]);
    expect(r.rows).toEqual([['cherry', '20', 'NYC']]);
  });

  it('ops referencing unknown columns are no-ops, not crashes', async () => {
    expect((await applyTabularOps(T, [{ op: 'filter', column: 'nope', compare: 'eq', value: 'x' }])).rows).toHaveLength(
      3,
    );
    expect((await applyTabularOps(T, [{ op: 'sort', column: 'nope' }])).rows).toHaveLength(3);
    expect(await applyTabularOps(T, [{ op: 'group', by: ['nope'] }])).toEqual(T);
  });
});

describe('group', () => {
  it('defaults to a count per distinct key, in first-appearance order', async () => {
    const r = await applyTabularOps(T, [{ op: 'group', by: ['city'] }]);
    expect(r.columns).toEqual(['city', 'count']);
    expect(r.rows).toEqual([
      ['NYC', '2'],
      ['LA', '1'],
    ]);
  });

  it('computes sum/avg/min/max/first/concat aggregates', async () => {
    const r = await applyTabularOps(T, [
      {
        op: 'group',
        by: ['city'],
        aggregates: [
          { fn: 'sum', column: 'qty' },
          { fn: 'avg', column: 'qty', as: 'avg qty' },
          { fn: 'min', column: 'qty' },
          { fn: 'max', column: 'qty' },
          { fn: 'first', column: 'name' },
          { fn: 'concat', column: 'name' },
        ],
      },
    ]);
    expect(r.columns).toEqual(['city', 'sum(qty)', 'avg qty', 'min(qty)', 'max(qty)', 'first(name)', 'concat(name)']);
    expect(r.rows[0]).toEqual(['NYC', '30', '15', '10', '20', 'apple', 'apple, cherry']);
    expect(r.rows[1]).toEqual(['LA', '3', '3', '3', '3', 'banana', 'banana']);
  });

  it('groups by multiple columns and feeds later ops', async () => {
    const r = await applyTabularOps(T, [
      { op: 'group', by: ['city', 'name'] },
      { op: 'filter', column: 'city', compare: 'eq', value: 'NYC' },
    ]);
    expect(r.columns).toEqual(['city', 'name', 'count']);
    expect(r.rows).toHaveLength(2);
  });

  it('numeric aggregates over non-numeric values are blank, not NaN', async () => {
    const r = await applyTabularOps(T, [{ op: 'group', by: ['city'], aggregates: [{ fn: 'sum', column: 'name' }] }]);
    expect(r.rows[0]).toEqual(['NYC', '']);
  });
});

describe('askAi', () => {
  it('sends the current data + question and the reply feeds the next op', async () => {
    let prompt = '';
    const ai: AiComplete = async (p) => {
      prompt = p;
      return 'name,qty\napple,10\nbanana,3\ncherry,20\ndate,99\n';
    };
    const r = await applyTabularOps(
      T,
      [
        { op: 'askAi', question: 'append a date row' },
        { op: 'filter', column: 'qty', compare: 'gte', value: '10' },
      ],
      { ai },
    );
    expect(prompt).toContain('apple,10,NYC');
    expect(prompt).toContain('append a date row');
    expect(r.rows.map((row) => row[0])).toEqual(['apple', 'cherry', 'date']);
  });

  it('parseAiTable tolerates markdown fences and JSON replies', () => {
    expect(parseAiTable('Sure!\n```csv\na,b\n1,2\n```\n', 'csv').rows).toEqual([['1', '2']]);
    const t = parseAiTable('[{"a":"1","b":"2"},{"a":"3"}]', 'json');
    expect(t.columns).toEqual(['a', 'b']);
    expect(t.rows).toEqual([
      ['1', '2'],
      ['3', ''],
    ]);
  });

  it('without an AiComplete it throws a clear error', async () => {
    await expect(applyTabularOps(T, [{ op: 'askAi', question: 'x' }])).rejects.toThrow(/AiComplete/);
  });
});
