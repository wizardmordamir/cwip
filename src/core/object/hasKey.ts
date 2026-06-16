import { curry } from '../flow';
import type { Obj } from '../types';

export const hasKey = curry((key: string, obj: Obj): boolean => Object.hasOwn(obj, key));
