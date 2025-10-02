export const existy = <T>(val: T): boolean => typeof val !== 'undefined' && val !== null;
export const truthy = <T>(val: T): boolean => val !== false && existy(val);

export const containsString = (string: string, substr: string, insensitive = false): boolean =>
  !insensitive
    ? string.indexOf(substr) > -1
    : string.toUpperCase().indexOf(substr.toUpperCase()) > -1;

export const isPrimitive = <T>(val: T): boolean =>
  val === null || !(typeof val === 'object' || typeof val === 'function');

export const isFunction = <T>(val: T): boolean => typeof val === 'function';
export const isNumber = <T>(val: T): boolean => Number.isFinite(val);

// false for instanceof String
export const isString = (value: any): value is string => typeof value === 'string';

export const isObjectNotArray = <T>(val: T): boolean =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

// return true if all keys in obj are either not existy, empty arrays, or empty objects
export const isEmptyDeep = <T>(obj: T): boolean =>
  isPrimitive(obj)
    ? !existy(obj)
    : Array.isArray(obj)
      ? obj.every((a) => isEmptyDeep(a))
      : Object.keys(obj).every((k) =>
          Array.isArray(obj[k])
            ? obj[k].every((a) => isEmptyDeep(a))
            : isObjectNotArray(obj[k])
              ? isEmptyDeep(obj[k])
              : !existy(obj[k]),
        );

export const stringIncludesAny = (
  strings: string[],
  string: string,
  insensitive = false,
): boolean => {
  if (insensitive) {
    string = string.toLowerCase();
  }
  for (let i = 0; i < strings.length; i++) {
    if (string.includes(insensitive ? strings[i].toLowerCase() : strings[i])) {
      return true;
    }
  }
  return false;
};
