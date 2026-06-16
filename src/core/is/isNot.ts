import { curry } from '../flow/curry';

export const isNot = curry((evaluator: unknown, value: any): boolean =>
  typeof evaluator === 'function' ? !evaluator(value) : !evaluator,
);
