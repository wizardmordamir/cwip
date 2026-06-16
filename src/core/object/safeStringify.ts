import { isString } from '../is';

const safeTypes = ['boolean', 'number'];

function _decycle(obj: any, seen = new WeakSet()): any {
  if (typeof obj === 'undefined' || obj === null || safeTypes.includes(typeof obj)) {
    return obj;
  }
  if (isString(obj)) {
    return obj;
  }
  if (typeof obj === 'symbol' || typeof obj === 'function') {
    return obj.toString();
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (obj instanceof RegExp) {
    return obj.toString();
  }
  if (obj instanceof Error) {
    const errorObj: Record<string, any> = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
    for (const key of Object.keys(obj)) {
      if (!(key in errorObj)) {
        errorObj[key] = _decycle(obj[key], seen);
      }
    }
    return errorObj;
  }
  if (seen.has(obj)) {
    return '[Circular]';
  }
  if (obj instanceof Set) {
    seen.add(obj);
    return Array.from(obj).map((item) => _decycle(item, seen));
  }
  if (obj instanceof Map) {
    seen.add(obj);
    return Array.from(obj.entries()).map(([key, value]) => [_decycle(key, seen), _decycle(value, seen)]);
  }
  if (Array.isArray(obj)) {
    seen.add(obj);
    return obj.map((item) => _decycle(item, seen));
  }
  if (typeof obj === 'object') {
    seen.add(obj);
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = _decycle(obj[key], seen);
    }
    return result;
  }
  return obj;
}

/**
 * Transforms non-standard JSON types into serializable formats.
 */
const transformValue = (value: any): any => {
  if (value instanceof Error) {
    // Manually create an object with the non-enumerable properties
    return {
      ...value, // Spreads any custom extra properties like 'extra: 42'
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (value instanceof Set) return Array.from(value);
  if (value instanceof Map) return Array.from(value.entries());

  const type = typeof value;
  if (type === 'symbol' || type === 'function' || value instanceof RegExp) {
    return value.toString();
  }

  return value;
};

export const safeStringify = (
  obj: any,
  replacer?: ((this: any, key: string, value: any) => any) | (number | string)[],
  space?: string | number,
): string => {
  // 1. Top-Level Bypass
  // If it's already a string, return it directly (no double quotes)
  if (typeof obj === 'string') return obj;
  if (obj === undefined) return '';

  // Handle other non-JSON primitives (Symbols, Functions, etc.)
  const rootTransform = transformValue(obj);
  if (rootTransform !== obj) {
    return String(rootTransform);
  }

  const cache = new WeakSet();

  // 2. Optimization: Pre-process whitelist if it's an array
  const whitelist = Array.isArray(replacer) ? new Set(replacer.map(String)) : null;

  try {
    return JSON.stringify(
      obj,
      function (key, value) {
        // Apply our custom transformations (Errors, Sets, Maps, etc.)
        const val = transformValue(value);

        // Circular Reference Logic
        if (val !== null && typeof val === 'object') {
          if (cache.has(val)) return '[Circular]';
          cache.add(val);
        }

        // Whitelist Logic (optimized with Set lookup)
        if (whitelist && key !== '' && !whitelist.has(key)) {
          return undefined;
        }

        // Custom Function Replacer Logic
        if (typeof replacer === 'function') {
          return replacer.call(this, key, val);
        }

        return val;
      },
      space,
    );
  } catch (err: any) {
    return `[Error: ${err.message}]`;
  }
};
