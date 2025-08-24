/* eslint no-control-regex: 0 */
export const isASCII = (str: string, extended) =>
  (extended ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(str);

export const isPrintableASCII = (str: string) => /^[\x20-\xFF]*$/.test(str);

export const asciiExtendedRegex = /([^\x20-\xFF]+)/gi;

// in a string - must be first or escaped
// escape these [] for the regex to work
export const escapeForRegex = (str: string) => {
  str.replaceAll('[', '\\[');
  str.replaceAll(']', '\\]');
  str.replaceAll('-', '\\-');
  return str;
};

export const makeRegexToMatchCharsNotInStr = (str: string) =>
  new RegExp('([^' + escapeForRegex(str) + '])', 'g');

export const makeRegexToMatchCharsInStr = (str: string) =>
  new RegExp('([' + escapeForRegex(str) + '])', 'g');

// /([^a-z0-9'\-.() ]+)/gi, example if some symbols were allowed
export const alphaNumRegex = /([^a-z0-9']+)/gi;

export const removeFromStart = (str: string, char: string) => {
  let strArr = str.split('');
  let begin = 0;
  for (let i = 0; i < strArr.length; i++) {
    if (strArr[i] !== char) {
      break;
    }
    begin = i;
  }
  strArr = strArr.slice(begin);
  return strArr.join('');
};

export const removeFromEnd = (str: string, char: string) => {
  let strArr = str.split('');
  while (strArr[-1] === char) {
    strArr = strArr.slice(0, strArr.length - 1);
  }
  return strArr.join('');
};

export const removeFromEnds = (str: string, char: string) => {
  let strArr = str.split('');
  let begin = 0;
  for (let i = 0; i < strArr.length; i++) {
    if (strArr[i] !== char) {
      break;
    }
    begin = i;
  }
  strArr = strArr.slice(begin);
  while (strArr[-1] === char) {
    strArr = strArr.slice(0, strArr.length - 1);
  }
  return strArr.join('');
};

export const removeFromMiddle = (str: string, char: string) => {
  let strArr = str.split('');
  for (let i = strArr.length - 2; i > 0; i--) {
    if (strArr[i] === char && strArr[i + 1] === char) {
      strArr.splice(i + 1, 1);
    }
  }
  return strArr.join('');
};
