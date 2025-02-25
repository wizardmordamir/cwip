/* eslint-disable */
import { ArrayOfObjectKeys, PartialDefinedObject } from '../../typescriptUtils';

type ReduceKeys = <T>(obj: T, keys: ArrayOfObjectKeys<T>) => PartialDefinedObject<T>;

export const reduceKeys: ReduceKeys = (obj, keys) =>
  keys.reduce((accum, curr) => ({ ...accum, [curr]: obj[curr] }), {});
