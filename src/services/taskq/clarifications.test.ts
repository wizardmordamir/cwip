import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { addClarification, answerClarification, getClarification, openClarifications } from './clarifications';
import { migrate, SCHEMA_VERSION } from './schema';
import { addTask, listChildren, setStatus } from './tasks';
import type { TaskqDb } from './types';

function fresh(): TaskqDb {
  const d = new Database(':memory:') as unknown as TaskqDb;
  d.exec('PRAGMA foreign_keys = ON');
  migrate(d);
  return d;
}

describe('clarifications + children (v4)', () => {
  test('schema at v4', () => {
    fresh();
    expect(SCHEMA_VERSION).toBe(4);
  });

  test('open clarifications list needs_input gateways; answering closes them', () => {
    const db = fresh();
    const epic = addTask(db, { title: 'big epic', status: 'needs_input' });
    addClarification(db, epic, 'Which framework?', 1000);

    let open = openClarifications(db);
    expect(open.length).toBe(1);
    expect(open[0].question).toBe('Which framework?');

    answerClarification(db, epic, 'three.js', 2000);
    expect(getClarification(db, epic)?.answer).toBe('three.js');
    open = openClarifications(db);
    expect(open.length).toBe(0); // answered → no longer open
  });

  test('listChildren returns a task tree in order', () => {
    const db = fresh();
    const parent = addTask(db, { title: 'parent' });
    const c1 = addTask(db, { title: 'child 1', parent_id: parent }, { at: 'bottom' });
    addTask(db, { title: 'child 2', parent_id: parent }, { at: 'bottom' });
    addTask(db, { title: 'unrelated' }, { at: 'bottom' });
    expect(listChildren(db, parent).map((t) => t.title)).toEqual(['child 1', 'child 2']);
    setStatus(db, c1, 'ready');
    expect(listChildren(db, parent).length).toBe(2);
  });

  test('answering a missing clarification throws', () => {
    const db = fresh();
    const id = addTask(db, { title: 't' });
    expect(() => answerClarification(db, id, 'x', 1)).toThrow(/no clarification/);
  });
});
