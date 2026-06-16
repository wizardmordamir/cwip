import { path } from '../object';

export const findKeyMatch = (arrKey: string, dataKey: string, arr: any[]) => (data: any) => {
  // Extract the getter once
  const getFromArr = path(arrKey as any);
  const targetValue = data[dataKey];

  return arr.find((a) => getFromArr(a) === targetValue);
};
