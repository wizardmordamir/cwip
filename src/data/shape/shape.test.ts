import { describe, expect, it } from 'bun:test';
import { inferRowShape, inferShape } from './inferShape';
import { shapeToInterface, shapeToTs, shapeToTypeAlias } from './shapeToTs';

describe('inferShape', () => {
  it('infers primitives and null', () => {
    expect(inferShape('x')).toEqual({ kind: 'string' });
    expect(inferShape(1)).toEqual({ kind: 'number' });
    expect(inferShape(true)).toEqual({ kind: 'boolean' });
    expect(inferShape(null)).toEqual({ kind: 'null' });
    expect(inferShape(new Date())).toEqual({ kind: 'date' });
  });

  it('infers an object shape', () => {
    const s = inferShape({ id: 1, name: 'a' });
    expect(s).toEqual({
      kind: 'object',
      fields: [
        { key: 'id', shape: { kind: 'number' }, optional: false },
        { key: 'name', shape: { kind: 'string' }, optional: false },
      ],
    });
  });

  it('merges array elements, marking sometimes-missing keys optional', () => {
    const s = inferShape([
      { id: 1, name: 'a' },
      { id: 2, name: 'b', nickname: 'bee' },
    ]);
    expect(s.kind).toBe('array');
    if (s.kind !== 'array' || s.element.kind !== 'object') throw new Error('expected array of object');
    const fields = Object.fromEntries(s.element.fields.map((f) => [f.key, f]));
    expect(fields.id.optional).toBe(false);
    expect(fields.nickname.optional).toBe(true);
  });

  it('forms a union (X | null) for nullable fields across rows', () => {
    const row = inferRowShape([{ note: 'hi' }, { note: null }]);
    if (row.kind !== 'object') throw new Error('expected object');
    const note = row.fields.find((f) => f.key === 'note')!;
    expect(note.shape.kind).toBe('union');
  });

  it('empty array → array of unknown', () => {
    expect(inferShape([])).toEqual({ kind: 'array', element: { kind: 'unknown' } });
  });
});

describe('shapeToTs', () => {
  it('renders an object type expression', () => {
    const ts = shapeToTs(inferShape({ id: 1, tags: ['a'] }));
    expect(ts).toContain('id: number;');
    expect(ts).toContain('tags: string[];');
  });

  it('renders optional + nullable members', () => {
    const ts = shapeToTs(inferRowShape([{ a: 1 }, { a: 1, b: null }]));
    expect(ts).toContain('a: number;');
    expect(ts).toMatch(/b\?: .*null/);
  });

  it('shapeToInterface emits a named interface for the row type', () => {
    const out = shapeToInterface('UserRow', inferRowShape([{ id: 1, name: 'a' }]));
    expect(out.startsWith('export interface UserRow {')).toBe(true);
    expect(out).toContain('id: number;');
  });

  it('shapeToTypeAlias for a result set', () => {
    const out = shapeToTypeAlias('UserList', inferShape([{ id: 1 }]));
    expect(out).toBe('export type UserList = {\n  id: number;\n}[];\n');
  });

  it('quotes non-identifier keys', () => {
    const ts = shapeToTs(inferShape({ 'weird-key': 1 }));
    expect(ts).toContain('"weird-key": number;');
  });
});
