import { safeStringify } from '../../safeStringify';

export const removeDups = <T>(arr: T[]): T[] => {
  return arr.filter(
    (item, index, self) =>
      index === self.findIndex((t) => safeStringify(t) === safeStringify(item)),
  );
};
