// Example usage:
// const input = { a: '{"b":"{\\"c\\":3}"}', d: '[1,2,"{\\"e\\":4}"]' };
// const output = deepJsonParse(input);
// console.log(output); // { a: { b: { c: 3 } }, d: [1, 2, { e: 4 }] }
// handles nested JSON strings in objects and arrays

export type SkipParsingFn = (_value: any) => boolean;

// Try to JSON.parse a value, return original value if parsing fails
export const safeParse = (value: any, skipParsingFn?: SkipParsingFn): any => {
  if (typeof value !== 'string') return value;
  if (skipParsingFn?.(value)) {
    return value;
  }
  try {
    return JSON.parse(value, (_, v) => safeParse(v, skipParsingFn));
  } catch {
    return value;
  }
};

// handle strings, arrays, objects, null, undefined, numbers, booleans
// but not functions, dates, regexes, maps, sets, etc.
export function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

// Recursively parse JSON strings in an object or array or any value
export const deepJsonParse = (
  obj: any,
  seen = new WeakSet(),
  maxDepth = 10,
  currentDepth = 0,
  skipParsingFn?: SkipParsingFn,
): any => {
  if (currentDepth > maxDepth) return obj;

  if (typeof obj === 'object' && obj !== null) {
    if (seen.has(obj)) return obj;
    seen.add(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      deepJsonParse(safeParse(item, skipParsingFn), seen, maxDepth, currentDepth + 1, skipParsingFn),
    );
  } else if (isPlainObject(obj)) {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = deepJsonParse(safeParse(obj[key], skipParsingFn), seen, maxDepth, currentDepth + 1, skipParsingFn);
    }
    return result;
  } else {
    return safeParse(obj, skipParsingFn);
  }
};
