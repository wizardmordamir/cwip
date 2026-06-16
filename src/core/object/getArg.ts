export const getArg = (...args) => {
  return args[0];
};

export const getArgAt =
  (index) =>
  (...args) => {
    return args[index];
  };

export const getArgLast = (...args) => {
  return args[args.length - 1];
};

export default getArg;
