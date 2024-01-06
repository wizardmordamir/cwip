import { shallowClone } from './objects';

export const valsExistInArray = (arr: [], vals: [], key: string) => vals.map((val) => (key ? !!arr.find((a) => a[key] === val) : arr.indexOf(val) !== -1));

export const removeArrayValues = <T>(arr: T[], vals: T[], key: string): T[] =>
  arr.reduceRight((accum, item, i) => (key ? (vals.indexOf(item[key]) !== -1 ? accum.toSpliced(i, 1) : accum) : vals.indexOf(item) !== -1 ? accum.toSpliced(i, 1) : accum), [...arr]);

export const removePrimitiveDups = <T>(arr: T[]): T[] => [...new Set(arr)];
