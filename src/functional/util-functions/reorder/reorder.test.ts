import { reorder } from '.';

const arr = [1, 2, 3, 4, 5];
const arrOfObjs = [{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }];

describe('reorder', () => {
  it('should correctly reorder array of numbers', () => {
    const reorderedIntsArr = reorder(0, 2, arr);

    expect(reorderedIntsArr).toEqual([2, 3, 1, 4, 5]);
  });

  it('should allow partial application', () => {
    const partiallyAppliedReorder = reorder(0, 2);

    expect(partiallyAppliedReorder(arr)).toEqual([2, 3, 1, 4, 5]);
  });

  it('should correctly reorder array of objects', () => {
    const reorderedObjsArr = reorder(0, 2, arrOfObjs);

    expect(reorderedObjsArr).toEqual([{ b: 2 }, { c: 3 }, { a: 1 }, { d: 4 }]);
  });

  it('should move item to end of array if toIndex is out of bound', () => {
    const reorderedIntsArr = reorder(0, 9, arr);

    expect(reorderedIntsArr).toEqual([2, 3, 4, 5, 1]);
  });

  it('should return [] if passed undefined', () => {
    const undefinedArray = reorder(0, 2, undefined);

    expect(undefinedArray).toEqual([]);
  });

  it('should return [] if passed null', () => {
    const nullArray = reorder(0, 2, null);

    expect(nullArray).toEqual([]);
  });
});
