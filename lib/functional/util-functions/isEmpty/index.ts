export const isEmpty = (value: object | any[]): boolean => {
  if (value === null || value === undefined) {
    return true;
  }

  return !Object.keys(value).length;
};
