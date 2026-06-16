import { curry } from '../flow/curry';

export const includes = curry(<V>(value: V, array: V[]) => array.includes(value)) as unknown as {
  <V>(value: V, array: V[]): boolean;
  <V>(value: V): (array: V[]) => boolean;
};
