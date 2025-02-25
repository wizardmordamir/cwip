import { IdentityInterface, MonadInterface } from '../../interfaces';
import { curry } from '../../util-functions/curry';
import { Identity, ShortCircuit } from '../index';

export const ErrorMonad = curry(
  (
    evaluator: Function,
    success: Function,
    errorMessage: string,
    x: MonadInterface<any>,
  ): IdentityInterface<any> => {
    return evaluator(x) ? Identity(success(x)) : ShortCircuit(new Error(errorMessage));
  },
);

export default ErrorMonad;
