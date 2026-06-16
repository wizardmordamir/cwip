import type { Obj } from '../types';

// biome-ignore lint: allowing Object type
export const extend = (...objects: Obj[]): Object => Object.assign({}, ...objects);
