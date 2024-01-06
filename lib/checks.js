import { stringify } from './objects';

export const existy = (val) => typeof val !== 'undefined' && val !== null;

export const truthy = (val) => val !== false && existy(val);

export const containsString = (string, substr, sensitive = false) => (sensitive ? string.indexOf(substr) > -1 : string.toUpperCase().indexOf(substr.toUpperCase()) > -1);

export const isObject = (val) => typeof val === 'object' && val !== null && !Array.isArray(val);

export const missingKeys = (obj, keys) => {
  var missing = [];
  for (var i = 0; i < keys.length; i++) {
    if (typeof obj[keys[i]] == 'undefined') {
      missing.push(keys[i]);
    }
  }
  if (missing.length) {
    return missing;
  }
  return false;
};

// check for expected properties in obj
export const propsExist = (obj, properties) => {
  try {
    if (!isObject(obj)) throw new Error('expected object with keys: ' + stringify(properties) + ' instead of: ' + stringify(obj));
    let missing = missingKeys(obj, properties);
    if (missing) {
      throw new Error('missing keys ' + stringify(missing) + ' in: ' + stringify(obj));
    }
    return true;
  } catch (e) {
    console.error(e.stack);
  }
};

// return true if all keys in obj are empty or empty arrays
export const allKeysEmpty = (obj) => {
  const keys = Object.getOwnPropertyNames(obj);
  for (let i = 0; i < keys.length; i++) {
    if (Array.isArray(obj[keys[i]])) {
      if (obj[keys[i]].length) {
        return false;
      }
    } else {
      if (existy(obj[keys[i]])) {
        return false;
      }
    }
  }
  return true;
};
