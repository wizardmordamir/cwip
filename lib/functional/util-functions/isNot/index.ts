import { curry } from '../curry';

export const isNot = curry((evaluator: Function | any, value: any) => {
  return typeof evaluator === 'function' ? !evaluator(value) : !evaluator;
});
