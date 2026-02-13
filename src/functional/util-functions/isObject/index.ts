export const isObject = (value: any): boolean => {
  return Boolean(
    value &&
    (Object.getPrototypeOf(value) === null || value.constructor === Object) &&
    value !== null,
  );
};
