export const split =
  (delimiter: string | RegExp = '') =>
  (str: string) =>
    str.split(delimiter);
