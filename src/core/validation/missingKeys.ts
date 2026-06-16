import { without } from '../array';
import { curry } from '../flow';

// Now 'without' knows it returns string[] when passed string arrays
export const missingKeys = curry((list: string[], obj: Record<string, any>) => without(Object.keys(obj), '', list));
