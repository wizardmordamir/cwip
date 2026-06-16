export const pick = (keys: string[]) => (v: any) =>
  keys.reduce((acc, key) => {
    acc[key] = v[key];
    return acc;
  }, {} as any);
