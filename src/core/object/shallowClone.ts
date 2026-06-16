import type { Obj } from '../types';

export const shallowClone = (obj: Obj): Obj => Object.assign({}, obj);
