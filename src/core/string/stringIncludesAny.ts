export const stringIncludesAny = (strings: string[], string: string, insensitive = false): boolean => {
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
