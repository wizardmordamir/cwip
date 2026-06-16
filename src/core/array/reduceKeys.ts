import type { ArrayOfObjectKeys, PartialDefinedObject } from '../types';

type ReduceKeys = <T>(obj: T, keys: ArrayOfObjectKeys<T>) => PartialDefinedObject<T>;

export const reduceKeys: ReduceKeys = (obj, keys) =>
  // biome-ignore lint: allowing spread operator for better readability
  keys.reduce((accum, curr) => ({ ...accum, [curr]: obj[curr] }), {});
