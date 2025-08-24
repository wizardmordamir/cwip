const safeTypes = ['boolean', 'number'];

export const isString = (value: any): value is string => typeof value === 'string';

function decycle(obj: any, seen = new WeakSet()): any {
  if (
    typeof obj === 'undefined' ||
    obj === null ||
    safeTypes.includes(typeof obj) ||
    isString(obj)
  ) {
    return obj;
  }
  if (typeof obj === 'symbol' || typeof obj === 'function') {
    return obj.toString();
  }
  if (seen.has(obj)) {
    return '[Circular]';
  }
  if (Array.isArray(obj)) {
    seen.add(obj);
    return obj.map((item) => decycle(item, seen));
  }
  if (typeof obj === 'object') {
    seen.add(obj);
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = decycle(obj[key], seen);
    }
    return result;
  }
  return obj;
}

export const safeStringify = (obj: any): string => {
  if (typeof obj === 'undefined') return undefined;
  if (obj === null) return 'null';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'symbol' || typeof obj === 'function') return obj.toString();
  return JSON.stringify(decycle(obj));
};
