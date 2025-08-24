import { wrapAsyncPipe } from './wrapAsyncPipe';

describe('wrapAsyncPipe', () => {
  const wrapper =
    <T>(fn: (_value: T) => T | Promise<T>) =>
    async (value: T) => {
      // Example wrapper: logs and calls the function
      return fn(value);
    };
  const errorHandler = (_error: any) => {
    return 'error' as any;
  };

  it('pipes synchronous functions', async () => {
    const add = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const pipe = wrapAsyncPipe(wrapper, errorHandler)(add, double);
    await expect(pipe(2)).resolves.toBe(6);
  });

  it('pipes asynchronous functions', async () => {
    const addAsync = async (x: number) => x + 1;
    const doubleAsync = async (x: number) => x * 2;
    const pipe = wrapAsyncPipe(wrapper, errorHandler)(addAsync, doubleAsync);
    await expect(pipe(2)).resolves.toBe(6);
  });

  it('pipes mixed sync and async functions', async () => {
    const add = (x: number) => x + 1;
    const doubleAsync = async (x: number) => x * 2;
    const pipe = wrapAsyncPipe(wrapper, errorHandler)(add, doubleAsync);
    await expect(pipe(2)).resolves.toBe(6);
  });

  it('pipes with initial value', async () => {
    const identity = (x: number) => x;
    const pipe = wrapAsyncPipe(wrapper, errorHandler)(identity);
    await expect(pipe(42)).resolves.toBe(42);
  });

  it('handles errors thrown in sync function and calls errorHandler', async () => {
    const thrower = (_: number) => {
      throw new Error('fail');
    };
    const pipe = wrapAsyncPipe(wrapper, errorHandler)(thrower);
    await expect(pipe(1)).resolves.toBe('error');
  });

  it('handles errors thrown in async function and calls errorHandler', async () => {
    const throwAsync = async (_: number) => {
      throw new Error('fail');
    };
    const pipe = wrapAsyncPipe(wrapper, errorHandler)(throwAsync);
    await expect(pipe(1)).resolves.toBe('error');
  });

  it('pipes with no functions returns initial value', async () => {
    const pipe = wrapAsyncPipe(wrapper, errorHandler)();
    await expect(pipe(5)).resolves.toBe(5);
  });

  it('wrapper can modify the result', async () => {
    const wrapperMod =
      <T>(fn: (_value: T) => T | Promise<T>) =>
      async (value: T) => {
        const result = await fn(value);
        // Example: always add 10
        // @ts-ignore
        return typeof result === 'number' ? result + 10 : result;
      };
    const add = (x: number) => x + 1;
    const pipe = wrapAsyncPipe(wrapperMod, errorHandler)(add);
    await expect(pipe(2)).resolves.toBe(13); // (2 + 1) + 10
    const longerPipe = wrapAsyncPipe(wrapperMod, errorHandler)(add, add);
    await expect(longerPipe(2)).resolves.toBe(24); // ((2 + 1) + 10) + 1 + 10
  });
});
