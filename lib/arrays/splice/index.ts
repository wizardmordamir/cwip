export const splice = <T>(arr: T[], start: number, deleteCount: number = 1, ...items: T[]): T[] => {
  arr.splice(start, deleteCount, ...items);
  return arr;
};
