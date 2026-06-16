export const arrToKeys =
  (...keys: string[]) =>
  (arr: any[]) =>
    keys.reduce(
      (acc, key, i) => {
        acc[key] = arr[i];
        return acc;
      },
      {} as Record<string, any>,
    );
