export const addKeyA = (key: string, fn: (x: any) => any) => async (x: any) => {
  x[key] = await fn(x);
  return x;
};
