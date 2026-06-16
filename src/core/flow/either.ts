import { curry } from './curry';

type EvaluatorType = (...args: any[]) => any | any;

export const either = curry(
  (evaluator: EvaluatorType, success: (...args: any[]) => any, fail: (...args: any[]) => any) =>
    (...args: any) => {
      const evaluated = typeof evaluator === 'function' ? evaluator(...args) : evaluator;
      return evaluated ? success(...args) : fail(...args);
    },
);
