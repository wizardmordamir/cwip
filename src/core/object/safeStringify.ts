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
