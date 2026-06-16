// Removes extra whitespace from a string, leaving only single spaces between words and trimming leading/trailing spaces.
// Example: "  Hello   World  " -> "Hello World"
export const removeExtraWhitespace = <T>(value: T): T extends string ? string : T => {
  if (typeof value !== 'string') return value as any;
  return value.replace(/\s+/g, ' ').trim() as any;
};

export const containsWhitespace = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return /\s/.test(value);
};
