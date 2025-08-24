import { getArg, getArgAt, getArgLast } from '.';

describe('getArg', () => {
  it('return first argument', () => {
    const value = 'arg';
    const returned = getArg(value);
    expect(returned).toBe(value);
  });
  it('return first argument even with multiple args', () => {
    const value = 'arg';
    const value1 = 'arg1';
    const value2 = 'arg2';
    const returned = getArg(value, value1, value2);
    expect(returned).toBe(value);
  });
  it('return undefined when no args', () => {
    const returned = getArg();
    expect(returned).toBe(undefined);
  });
});
describe('getArgAt', () => {
  it('return argument at index', () => {
    const value = 'arg';
    const value1 = 'arg1';
    const value2 = 'arg2';
    const returned = getArgAt(1)(value, value1, value2);
    expect(returned).toBe(value1);
  });
});
describe('getArgLast', () => {
  it('return first argument if only one', () => {
    const value = 'arg';
    const returned = getArgLast(value);
    expect(returned).toBe(value);
  });
  it('return first argument even with multiple args', () => {
    const value = 'arg';
    const value1 = 'arg1';
    const value2 = 'arg2';
    const returned = getArgLast(value, value1, value2);
    expect(returned).toBe(value2);
  });
  it('return undefined when no args', () => {
    const returned = getArgLast();
    expect(returned).toBe(undefined);
  });
});
