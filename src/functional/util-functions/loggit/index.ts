export const loggit =
  (...args) =>
  (value) => {
    console.log(...args, value);
    return value;
  };
