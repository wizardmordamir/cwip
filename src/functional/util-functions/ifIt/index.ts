import { curry } from '..';
type EvaluatorType = Function | any;

export const ifIt = curry((evaluator: EvaluatorType, fn: Function, value) => {
  const evaluated = typeof evaluator === 'function' ? evaluator(value) : evaluator;
  return evaluated ? fn(value) : value;
});
