import { describe, expect, it } from 'bun:test';
import { pipeAsync } from './pipeAsync';

describe('pipeAsync', () => {
  it('pipes synchronous functions', async () => {
    const add = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const pipe = pipeAsync(add, double);
    await expect(pipe(2)).resolves.toBe(6); // (2 + 1) * 2 = 6
  });

  it('pipes asynchronous functions', async () => {
    const addAsync = async (x: number) => x + 1;
    const doubleAsync = async (x: number) => x * 2;
    const pipe = pipeAsync(addAsync, doubleAsync);
    await expect(pipe(2)).resolves.toBe(6);
  });

  it('pipes mixed sync and async functions', async () => {
    const add = (x: number) => x + 1;
    const doubleAsync = async (x: number) => x * 2;
    const pipe = pipeAsync(add, doubleAsync);
    await expect(pipe(2)).resolves.toBe(6);
  });

  it('pipes with initial value', async () => {
    const identity = (x: number) => x;
    const pipe = pipeAsync(identity);
    await expect(pipe(42)).resolves.toBe(42);
  });

  it('handles errors thrown in sync function', async () => {
    const thrower = (_: number) => {
      throw new Error('fail');
    };
    const pipe = pipeAsync(thrower);
    await expect(pipe(1)).rejects.toThrow('fail');
  });

  it('handles errors thrown in async function', async () => {
    const throwAsync = async (_: number) => {
      throw new Error('fail');
    };
    const pipe = pipeAsync(throwAsync);
    await expect(pipe(1)).rejects.toThrow('fail');
  });
  it('handles errors in mixed sync and async functions', async () => {
    const thrower = (_: number) => {
      throw new Error('fail');
    };
    const doubleAsync = async (x: number) => x * 2;
    const pipe = pipeAsync(thrower, doubleAsync);
    await expect(pipe(1)).rejects.toThrow('fail');
  });
  it('returns a promise that resolves to the final value', async () => {
    const add = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const pipe = pipeAsync(add, double);
    const result = await pipe(3);
    expect(result).toBe(8); // (3 + 1) * 2 = 8
  });
  it('returns a promise that resolves to the initial value if no functions are provided', async () => {
    const pipe = pipeAsync();
    const result = await pipe(5);
    expect(result).toBe(5); // No functions, should return initial value
  });
});
