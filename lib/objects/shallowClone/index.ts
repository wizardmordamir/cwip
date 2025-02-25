import type { Obj } from '../../ts-types';

export const shallowClone = (obj: Obj): Obj => Object.assign({}, obj);
