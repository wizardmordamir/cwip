import { Obj } from '../../ts-types';

export const deepClone = (obj: Obj): Obj => structuredClone(obj);
