import { isFunction } from '../is';

export const callOrReturnIt = (fn: any, item: any) => (isFunction(fn) ? fn(item) : fn);
