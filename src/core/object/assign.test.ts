import { describe, expect, it } from 'bun:test';
import { pipeAsync } from '../flow';
import { assign } from './assign';

describe('assign', () => {
  it('should assign the result of a function to a new key in the context', async () => {
    const ctx = { a: 1 };
    const result = await assign('b', (ctx: { a: number }) => ctx.a + 1)(ctx);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should work with async functions', async () => {
    const ctx = { a: 1 };
    const result = await assign('b', async (ctx: { a: number }) => ctx.a + 1)(ctx);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should not modify the original context object', async () => {
    const ctx = { a: 1 };
    await assign('b', (ctx: { a: number }) => ctx.a + 1)(ctx);
    expect(ctx).toEqual({ a: 1 });
  });

  it('should assign the result of a function to a new key in the context', async () => {
    // Define the type so 'ctx' isn't just 'object'
    const ctx = { a: 1 };

    // Call it normally - the new signature will now correctly infer T from ctx
    const result = await assign('b', (ctx: { a: number }) => ctx.a + 1)(ctx);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should handle multiple assignments with pipe', async () => {
    const ctx = { a: 1 };

    // When using pipeAsync, TS often needs a hint for the first step's input
    const result = await pipeAsync(
      assign('b', (c: { a: number }) => c.a + 1),
      assign('c', (c: { a: number; b: number }) => c.b + 1),
    )(ctx);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should handle multiple assignments manually', async () => {
    const ctx = { a: 1 };

    // Step 1: add 'b'
    const res1 = await assign('b', (c: { a: number }) => c.a + 1)(ctx);

    // Step 2: pass res1 (which has 'b') into the next one
    const res2 = await assign('c', (c: { b: number }) => c.b + 1)(res1);

    expect(res2).toEqual({ a: 1, b: 2, c: 3 });
  });
});
