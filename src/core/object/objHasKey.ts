import { curry } from '../flow';
import type { Obj } from '../types';

export const objHasKey = curry((obj: Obj, key: string): boolean => Object.hasOwn(obj, key));
