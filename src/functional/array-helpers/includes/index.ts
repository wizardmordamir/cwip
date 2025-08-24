import { curry } from '../..';

export const includes = curry(<V>(value: V, array: V[]) => array.includes(value));
