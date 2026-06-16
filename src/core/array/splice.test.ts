import { describe, expect, it } from 'bun:test';
import { splice } from '.';

describe('splice', () => {
  it('removes value from array', () => {
    const arr = [1, 2, 3];
    const start = 0;
    const deleteCount = 1;
    // Order: (start, deleteCount, items, arr)
    expect(splice(start, deleteCount, [], arr)).toEqual([2, 3]);
  });

  it('removes value from array with insert', () => {
    const arr = [1, 2, 4];
    const start = 0;
    const deleteCount = 1;
    const insert = [0]; // Must be an array
    expect(splice(start, deleteCount, insert, arr)).toEqual([0, 2, 4]);
  });

  it('removes value from array with insert and multiple delete', () => {
    const arr = [1, 2, 4];
    const start = 0;
    const deleteCount = 2;
    const insert = [0];
    expect(splice(start, deleteCount, insert, arr)).toEqual([0, 4]);
  });

  it('removes value from array with insert and single delete', () => {
    const arr = [1, 2, 4];
    const start = 1;
    const deleteCount = 1;
    const insert = [0];
    expect(splice(start, deleteCount, insert, arr)).toEqual([1, 0, 4]);
  });

  it('removes value from array with insert and multiple delete', () => {
    const arr = [1, 2, 4];
    const start = 1;
    const deleteCount = 2;
    const insert = [0];
    expect(splice(start, deleteCount, insert, arr)).toEqual([1, 0]);
  });

  it('removes value from array with insert and multiple delete past length', () => {
    const arr = [1, 2, 4];
    const start = 1;
    const deleteCount = 15;
    const insert = [0];
    expect(splice(start, deleteCount, insert, arr)).toEqual([1, 0]);
  });

  it('removes values with negative start', () => {
    const arr = [1, 2, 3];
    const start = -1;
    const deleteCount = 1;
    expect(splice(start, deleteCount, [], arr)).toEqual([1, 2]);
  });

  it('removes values with negative start and insert', () => {
    const arr = [1, 2, 4];
    const start = -1;
    const deleteCount = 1;
    const insert = [3];
    expect(splice(start, deleteCount, insert, arr)).toEqual([1, 2, 3]);
  });

  it('removes values with negative start and multiple delete past length', () => {
    const arr = [1, 2, 4];
    const start = -2;
    const deleteCount = 2;
    const insert = [3];
    expect(splice(start, deleteCount, insert, arr)).toEqual([1, 3]);
  });

  it('removes values with negative start and multiple delete past length', () => {
    const arr = [1, 2, 4];
    const start = -1;
    const deleteCount = 2;
    const insert = [3];
    expect(splice(start, deleteCount, insert, arr)).toEqual([1, 2, 3]);
  });
});
