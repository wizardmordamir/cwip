import { sideEffect, asyncSideEffect } from '../';

type ObjectType = { value: string };
const obj: ObjectType = { value: 'value' };
const objectRef = obj;
const objectDeepCopy = JSON.parse(JSON.stringify(obj));

type MockSideEffectFn = () => string;
const mockSideEffectFn: MockSideEffectFn = jest.fn(({ value }) => value);
const mockSideEffectFnFail: MockSideEffectFn = jest.fn(() => {
  throw Error('fail');
});

type MockAsyncSideEffectFn = () => Promise<string>;
const mockAsyncSideEffectFn: MockAsyncSideEffectFn = jest.fn(async ({ value }) =>
  Promise.resolve(value),
);
const mockAsyncSideEffectFnFail = jest.fn(async () => Promise.reject('fail'));

describe('sideEffect', () => {
  it('should call mockSideEffectFn', () => {
    const res = sideEffect(mockSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(mockSideEffectFn).toBeCalledWith(obj);
  });
  it('should call mockSideEffectFnFail', async () => {
    expect(() => sideEffect(mockSideEffectFnFail)(obj)).toThrow('fail');

    expect(mockSideEffectFnFail).toBeCalledWith(obj);
  });
  it('should not mutate original object', () => {
    const res = sideEffect(mockSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(res).toStrictEqual(objectRef);
    expect(res).toStrictEqual(objectDeepCopy);
  });
});
describe('asyncSideEffect', () => {
  it('should call mockAsyncSideEffectFn', async () => {
    const res = await asyncSideEffect(mockAsyncSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(mockAsyncSideEffectFn).toBeCalledWith(obj);
  });
  it('should call mockAsyncSideEffectFnc', async () => {
    await asyncSideEffect(mockAsyncSideEffectFnFail)(obj)
      .then(() => expect(true).toBe(false))
      .catch((e) => expect(e).toBe('fail'));
    expect(mockAsyncSideEffectFnFail).toBeCalledWith(obj);
    expect.assertions(2);
  });
  it('should not mutate original object async', async () => {
    const res = await asyncSideEffect(mockAsyncSideEffectFn)(obj);
    expect(res).toBe(obj);
    expect(res).toStrictEqual(objectRef);
    expect(res).toStrictEqual(objectDeepCopy);
  });
});
