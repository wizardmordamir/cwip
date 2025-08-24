import { curry } from '../curry';

const fn = (chunkSize: number, array: any[]): any[] => {
  const newArray = [...array];
  const chunk = newArray.splice(0, chunkSize);

  return newArray.length > chunkSize
    ? [chunk, ...fn(chunkSize, newArray)]
    : [chunk, newArray].filter((arr) => arr.length !== 0);
};

export const arrayChunker = curry(fn);
