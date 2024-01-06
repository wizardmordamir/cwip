import { missingVals } from "./arrays";

export const existy = (val) => typeof val !== "undefined" && val !== null;

export const truthy = (val) => val !== false && existy(val);

export const containsString = (string, substr, sensitive = false) =>
  sensitive
    ? string.indexOf(substr) > -1
    : string.toUpperCase().indexOf(substr.toUpperCase()) > -1;

export const isPrimitive = (val) =>
  val === null || !(typeof val == "object" || typeof val == "function");

export const isObject = (val) =>
  typeof val === "object" && val !== null && !Array.isArray(val);

export const missingKeys = (obj, keys) => missingVals(Object.keys(obj), keys);

// return true if all keys in obj are empty or empty arrays
export const isEmpty = (obj) =>
  isPrimitive(obj)
    ? !existy(obj)
    : Array.isArray(obj)
    ? obj.every((a) => isEmpty(a))
    : Object.keys(obj).every((k) =>
        Array.isArray(obj[k])
          ? obj[k].every((a) => isEmpty(a))
          : isObject(obj[k])
          ? isEmpty(obj[k])
          : !existy(obj[k])
      );
