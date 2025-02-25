import { Obj } from '../../ts-types';

export const extend = (...objects: Obj[]): Object => Object.assign({}, ...objects);
