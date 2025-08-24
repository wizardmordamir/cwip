export const zip = <T>(...arr: T[][]): T[][] =>
  [...Array(Math.min(...arr.map((a) => a.length)))].map((_, i) => arr.map((a) => a[i]));
