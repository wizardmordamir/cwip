export const containsString = (string: string, substr: string, insensitive = false): boolean =>
  !insensitive ? string.indexOf(substr) > -1 : string.toUpperCase().indexOf(substr.toUpperCase()) > -1;
