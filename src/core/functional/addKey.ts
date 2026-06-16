export const addKey = (key: string, fn: (v: any) => any) => (v: any) => {
  v[key] = fn(v);
  return v;
};
