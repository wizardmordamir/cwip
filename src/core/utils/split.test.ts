import { describe, expect, it } from 'bun:test';
import { split } from './split';

describe('split', () => {
  it('splits on a string delimiter', () => {
    expect(split(',')('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('splits on a RegExp delimiter', () => {
    expect(split(/\s+/)('a  b   c')).toEqual(['a', 'b', 'c']);
  });

  it('splits into characters when no delimiter is given', () => {
    expect(split()('abc')).toEqual(['a', 'b', 'c']);
  });

  it('is curried and reusable', () => {
    const onComma = split(',');
    expect(onComma('1,2')).toEqual(['1', '2']);
    expect(onComma('x,y,z')).toEqual(['x', 'y', 'z']);
  });
});
