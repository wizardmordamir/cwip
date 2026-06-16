import { curry } from '../..';

// Wrap the function in parentheses to properly separate the union members
type EvaluatorType = ((...args: any[]) => any) | unknown;

export const ifIt = curry((evaluator: EvaluatorType, fn: (...args: any[]) => any, value: any): any => {
  const evaluated = typeof evaluator === 'function' ? evaluator(value) : evaluator;
  return evaluated ? fn(value) : value;
});
