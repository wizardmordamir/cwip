import { Obj } from '../../ts-types';

// example: obj = { a: 1, b: 2, c: 3}, props = ['b', 'c'], return 2
export const firstExistingKeyValue = (values: any[], obj: Obj): any => {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if (values.includes(obj[keys[i]])) {
      return obj[keys[i]];
    }
  }
};
