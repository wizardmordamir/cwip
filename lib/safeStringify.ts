const safeTypes = ['boolean', 'number'];

export const isString = (value: any): value is string => typeof value === 'string';

export const safeStringify = (obj: any, seen = new WeakSet()): string => {
  if (typeof obj === 'undefined') {
    return 'undefined';
  }

  if (obj === null) {
    return 'null';
  }

  if (isString(obj)) {
    return obj;
  }

  if (typeof obj === 'symbol') {
    return obj.toString();
  }

  if (typeof obj === 'function') {
    return obj.toString();
  }

  if (safeTypes.includes(typeof obj)) {
    return JSON.stringify(obj);
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }

  try {
    seen.add(obj);
  } catch (err) {}

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => safeStringify(item, seen)).join(', ') + ']';
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    const result = {};

    for (const key of keys) {
      const value = obj[key];
      result[key] = safeStringify(value, seen);
    }

    return JSON.stringify(result);
  }

  return JSON.stringify(obj);
};
