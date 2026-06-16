const mergeDeep = (target: any, source: any, seen: WeakMap<any, any>): any => {
  if (typeof source !== 'object' || source === null) return source;
  if (seen.has(source)) return seen.get(source);

  // If target is not an object, initialize as object or array
  if (typeof target !== 'object' || target === null) {
    target = Array.isArray(source) ? [] : {};
  }

  seen.set(source, target);

  Object.keys(source).forEach((key) => {
    const srcVal = source[key];
    if (Array.isArray(srcVal)) {
      target[key] = srcVal;
    } else if (typeof srcVal === 'object' && srcVal !== null) {
      target[key] = mergeDeep(target[key], srcVal, seen);
    } else {
      target[key] = srcVal;
    }
  });

  return target;
};

// Distribute the arg tuple's element types into an intersection, so merging
// differently-shaped objects yields the combined shape instead of forcing every
// argument to a single `T` (e.g. ({a:1}, {b:2}) -> {a:number} & {b:number}).
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export const mergeObjectsDeep = <T extends object[]>(...objects: [...T]): UnionToIntersection<T[number]> => {
  const seen = new WeakMap();
  const merged = objects.reduce((acc, obj) => {
    return mergeDeep(acc, obj, seen);
  }, {} as any);
  return structuredClone(merged);
};
