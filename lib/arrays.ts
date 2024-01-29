// checks for vals at top level
export const excludes = <T>(arr: T[], vals: T[]): T[] => vals.filter((val) => !arr.includes(val));

// checks for vals at top level or at key
export const includes = <T>(arr: T[], vals: T[], key: string): boolean[] =>
  vals.map((val) => (key ? !!arr.find((a) => a[key] === val) : arr.indexOf(val) !== -1));

// checks for vals at top level or at key
export const without = <T>(arr: T[], vals: T[], key: string): T[] =>
  arr.reduceRight(
    (accum, item, i) =>
      key
        ? vals.indexOf(item[key]) !== -1
          ? accum.toSpliced(i, 1)
          : accum
        : vals.indexOf(item) !== -1
          ? accum.toSpliced(i, 1)
          : accum,
    [...arr],
  );

export const removePrimitiveDups = <T>(arr: T[]): T[] => [...new Set(arr)];

export const zip = (...arr) =>
  [...Array(Math.max(...arr.map((a) => a.length)))].map((_, i) => arr.map((a) => a[i]));
