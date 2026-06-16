import { describe, expect, it } from 'bun:test';
import { createToastStore } from './toastStore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('createToastStore', () => {
  it('adds toasts and returns generated ids', () => {
    const store = createToastStore();
    const id = store.add('hello', { durationMs: 0 });
    expect(store.getToasts()).toHaveLength(1);
    expect(store.getToasts()[0]).toMatchObject({ id, message: 'hello' });
  });

  it('dismisses by id', () => {
    const store = createToastStore();
    const id = store.add('a', { durationMs: 0 });
    store.add('b', { durationMs: 0 });
    store.dismiss(id);
    expect(store.getToasts().map((t) => t.message)).toEqual(['b']);
  });

  it('replaces a toast that reuses an id', () => {
    const store = createToastStore();
    store.add('first', { id: 'x', durationMs: 0 });
    store.add('second', { id: 'x', durationMs: 0 });
    expect(store.getToasts()).toHaveLength(1);
    expect(store.getToasts()[0].message).toBe('second');
  });

  it('caps the queue at `max`, dropping oldest', () => {
    const store = createToastStore({ max: 2 });
    store.add('a', { durationMs: 0 });
    store.add('b', { durationMs: 0 });
    store.add('c', { durationMs: 0 });
    expect(store.getToasts().map((t) => t.message)).toEqual(['b', 'c']);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const store = createToastStore();
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    store.add('a', { durationMs: 0 });
    expect(calls).toBe(1);
    unsub();
    store.add('b', { durationMs: 0 });
    expect(calls).toBe(1);
  });

  it('auto-dismisses after the duration elapses', async () => {
    const store = createToastStore();
    store.add('temp', { durationMs: 5 });
    expect(store.getToasts()).toHaveLength(1);
    await sleep(20);
    expect(store.getToasts()).toHaveLength(0);
  });

  it('clear() removes everything', () => {
    const store = createToastStore();
    store.add('a', { durationMs: 0 });
    store.add('b', { durationMs: 0 });
    store.clear();
    expect(store.getToasts()).toHaveLength(0);
  });
});
