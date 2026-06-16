import { useEffect, useState } from 'react';

/**
 * Returns `value` delayed by `delayMs`: the result only updates once the input has
 * stayed unchanged for that long. Drive a search request off the debounced value so
 * it fires when the user pauses typing rather than on every keystroke.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 250): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
};
