export const loggit =
  <T extends any[]>(...args: T) =>
  <V>(value: V): V => {
    console.log(...args, value);
    return value;
  };
