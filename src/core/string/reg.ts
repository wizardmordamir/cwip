// biome-ignore lint: allowing no-control-regex
export const isASCII = (str: string, extended = false) => (extended ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(str);

export const isPrintableASCII = (str: string) => /^[\x20-\xFF]*$/.test(str);

export const asciiExtendedRegex = /([^\x20-\xFF]+)/gi;

// Escape the characters that are special inside a regex character class (`[...]`):
// `]` closes it, `\` escapes, `^` negates (when first), `-` forms a range. `[` is
// harmless inside a class but escaped too for clarity. Returns a new string —
// `String.replaceAll` does not mutate (the previous version dropped the result).
export const escapeForRegex = (str: string) => str.replace(/[[\]\\^-]/g, '\\$&');

export const makeRegexToMatchCharsNotInStr = (str: string) => new RegExp(`([^${escapeForRegex(str)}])`, 'g');

export const makeRegexToMatchCharsInStr = (str: string) => new RegExp(`([${escapeForRegex(str)}])`, 'g');

// /([^a-z0-9'\-.() ]+)/gi, example if some symbols were allowed
export const alphaNumRegex = /([^a-z0-9']+)/gi;

// Strip a leading run of `char`. (The old version sliced at the last matching
// index instead of past it, leaving one char behind — and missed a single-char string.)
export const removeFromStart = (str: string, char: string) => {
  let start = 0;
  while (start < str.length && str[start] === char) start++;
  return str.slice(start);
};

// Strip a trailing run of `char`. (The old version compared `strArr[-1]`, which is
// always `undefined` in JS, so the loop never ran — a no-op.)
export const removeFromEnd = (str: string, char: string) => {
  let end = str.length;
  while (end > 0 && str[end - 1] === char) end--;
  return str.slice(0, end);
};

export const removeFromEnds = (str: string, char: string) => removeFromEnd(removeFromStart(str, char), char);

export const removeFromMiddle = (str: string, char: string) => {
  const strArr = str.split('');
  for (let i = strArr.length - 2; i > 0; i--) {
    if (strArr[i] === char && strArr[i + 1] === char) {
      strArr.splice(i + 1, 1);
    }
  }
  return strArr.join('');
};
