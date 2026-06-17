import { describe, expect, test } from 'bun:test';
import { validateNewTask } from './validate';

describe('validateNewTask', () => {
  test('accepts a minimal task', () => {
    expect(validateNewTask({ title: 'do a thing' })).toEqual([]);
  });

  test('requires a single-line title', () => {
    expect(validateNewTask({ title: '' })).toContain('title is required');
    expect(validateNewTask({ title: 'a\nb' })).toContain('title must be a single line');
  });

  test('rejects bad markers', () => {
    const errs = validateNewTask({
      title: 't',
      slug: 'bad id',
      group_key: 'bad/group',
      needs: ['ok', 'not ok'],
      model: 'gpt',
      think: 'huge',
      recur_n: 0,
    });
    expect(errs.length).toBeGreaterThanOrEqual(5);
  });

  test('rejects self-dependency', () => {
    expect(validateNewTask({ title: 't', slug: 'x', needs: ['x'] })).toContain('a task cannot depend on its own id');
  });

  test('accepts valid markers', () => {
    expect(
      validateNewTask({
        title: 't',
        slug: 'vault-ui',
        needs: ['db.migrate'],
        group_key: 'g',
        model: 'sonnet',
        think: 'low',
        recur_n: 10,
      }),
    ).toEqual([]);
  });
});
