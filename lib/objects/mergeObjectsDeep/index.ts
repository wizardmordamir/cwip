const mergeDeep = (target: any, source: any): any => {
  return Object.keys(source as object).reduce((acc, key) => {
    if (Array.isArray(source[key])) {
      acc[key] = source[key];
    } else if (typeof source[key] === 'object' && source[key] !== null) {
      if (!acc[key]) {
        acc[key] = {};
      }
      acc[key] = mergeDeep(acc[key], source[key]);
    } else {
      acc[key] = source[key];
    }
    return acc;
  }, target);
};

export const mergeObjectsDeep = <T>(...objects: T[]): T => {
  return structuredClone(
    objects.reduce((acc, obj) => {
      return mergeDeep(acc, obj);
    }, {} as T),
  );
};
