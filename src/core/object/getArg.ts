export const getArg = (...args: any[]) => {
  return args[0];
};

export const getArgAt =
  (index: any) =>
  (...args: any[]) => {
    return args[index];
  };

export const getArgLast = (...args: any[]) => {
  return args[args.length - 1];
};

export default getArg;
