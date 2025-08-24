import { curry } from '../curry';

const fn = (fromIndex: number, toIndex: number, array: any[]): any[] => {
  if (array === null || array === undefined) {
    return [];
  }

  const arrayCopy = [...array];
  const [itemToMove] = arrayCopy.splice(fromIndex, 1);

  arrayCopy.splice(toIndex, 0, itemToMove);

  return arrayCopy;
};

export const reorder = curry(fn);
