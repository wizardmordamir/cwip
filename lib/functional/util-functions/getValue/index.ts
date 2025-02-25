/* eslint-disable */
import { isEmpty } from '../isEmpty';
import { curry } from '../curry';

const fn = (path: string[], object: object): any => {
  if (!isEmpty(path)) {
    const [property] = path;

    return object?.hasOwnProperty(property) ? fn(path.slice(1), object[property]) : undefined;
  }

  return object;
};

export const getValue: ((path: string[]) => (object: object) => any) &
  ((path: string[], object: object) => any) = curry(fn);
