// Removes extra whitespace from a string, leaving only single spaces between words and trimming leading/trailing spaces.
// Example: "  Hello   World  " -> "Hello World"
export const removeExtraWhitespace = (value: string): string => {
  if (typeof value !== 'string') return value;
  return value.replace(/\s+/g, ' ').trim();
};

export const containsWhitespace = (value: string): boolean => {
  if (typeof value !== 'string') return false;
  return /\s/.test(value);
};
