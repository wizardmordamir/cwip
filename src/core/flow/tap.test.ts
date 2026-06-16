import { describe, expect, it, mock } from 'bun:test';
import { tap, tapAsync } from '../..';

type ObjectType = { value: string };
const obj: ObjectType = { value: 'value' };
const objectRef = obj;
const objectDeepCopy = JSON.parse(JSON.stringify(obj));

// 1. Update the type to accept the object being passed in
type MockSideEffectFn = (arg: { value: string }) => string;

// Now the implementation matches the type
const mockSideEffectFn: MockSideEffectFn = mock(({ value }) => value);

const mockSideEffectFnFail: MockSideEffectFn = mock(() => {
  throw Error('fail');
});

// 2. Do the same for the Async version
type MockAsyncSideEffectFn = (arg: { value: string }) => Promise<string>;

const mockAsyncSideEffectFn: MockAsyncSideEffectFn = mock(async ({ value }) => Promise.resolve(value));

// Note: Ensure this mock also matches the signature if it's assigned to the type
const mockAsyncSideEffectFnFail: MockAsyncSideEffectFn = mock(async () => Promise.reject('fail'));

describe('tap', () => {
  it('should call mockSideEffectFn', () => {
    const res = tap(mockSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(mockSideEffectFn).toBeCalledWith(obj);
  });
  it('should call mockSideEffectFnFail', async () => {
    expect(() => tap(mockSideEffectFnFail)(obj)).toThrow('fail');

    expect(mockSideEffectFnFail).toBeCalledWith(obj);
  });
  it('should not mutate original object', () => {
    const res = tap(mockSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(res).toStrictEqual(objectRef);
    expect(res).toStrictEqual(objectDeepCopy);
  });
});
describe('asyncSideEffect', () => {
  it('should call mockAsyncSideEffectFn', async () => {
    const res = await tapAsync(mockAsyncSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(mockAsyncSideEffectFn).toBeCalledWith(obj);
  });
  it('should call mockAsyncSideEffectFnc', async () => {
    await tapAsync(mockAsyncSideEffectFnFail)(obj)
      .then(() => expect(true).toBe(false))
      .catch((e) => expect(e).toBe('fail'));
    expect(mockAsyncSideEffectFnFail).toBeCalledWith(obj);
    expect.assertions(2);
  });
  it('should not mutate original object async', async () => {
    const res = await tapAsync(mockAsyncSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(res).toStrictEqual(objectRef);
    expect(res).toStrictEqual(objectDeepCopy);
  });
});
