import { describe, expect, it } from 'bun:test';
import { StateMonad } from './StateMonad';

describe('StateMonad', () => {
  it('round-trips a value through unit() and emit()', () => {
    expect(StateMonad.unit(42).emit()).toBe(42);
  });

  it('binds a synchronous transform, wrapping the raw return value', async () => {
    const m = await StateMonad.unit(1).bind((x) => x + 1);
    expect(m.emit()).toBe(2);
  });

  it('chains binds, snowballing the value forward', async () => {
    const m1 = await StateMonad.unit(1).bind((x) => x + 1);
    const m2 = await m1.bind((x) => x * 10);
    expect(m2.emit()).toBe(20);
  });

  it('awaits async bind functions', async () => {
    const m = await StateMonad.unit({ id: 123 }).bind(async (ctx) => ({
      ...ctx,
      data: `fetched-${ctx.id}`,
    }));
    expect(m.emit()).toEqual({ id: 123, data: 'fetched-123' });
  });

  it('returns a bound StateMonad directly instead of nesting it (monad-in-monad)', async () => {
    const inner = StateMonad.unit('inner');
    // Explicit <string>: bind() flattens at runtime, but the overload would otherwise
    // infer R = StateMonad<string> rather than the flattened string.
    const m = await StateMonad.unit('outer').bind<string>(() => inner);
    expect(m.emit()).toBe('inner');
  });

  it('awaits a Promise<StateMonad> return and flattens it', async () => {
    const m = await StateMonad.unit('x').bind<string>(() => Promise.resolve(StateMonad.unit('y')));
    expect(m.emit()).toBe('y');
  });

  it('short-circuits on a thrown error: later binds never run and the pre-throw value is preserved', async () => {
    let ranAfter = false;

    const failed = await StateMonad.unit('ok').bind(() => {
      throw new Error('Boom!');
    });
    // Once stopped, subsequent binds pass straight through without invoking fn.
    const after = await failed.bind(() => {
      ranAfter = true;
      return 'not ok';
    });

    expect(ranAfter).toBe(false);
    expect(after.emit()).toBe('ok'); // value from before the throwing bind is retained
  });
});
