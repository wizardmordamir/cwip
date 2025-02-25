import { curry } from '../../util-functions';
import { MaybeInterface } from '../../interfaces';

export const Maybe = curry(
  (onFail, checker, x): MaybeInterface<any> => ({
    passesChecker: (): boolean => checker(x),
    map: (fn): MaybeInterface<any> =>
      Maybe(onFail, checker, x).passesChecker()
        ? Maybe(onFail, checker, fn(x))
        : Maybe(onFail, checker, x),
    join: () => (Maybe(onFail, checker, x).passesChecker() ? x : onFail(x)),
    chain: (fn) => Maybe(onFail, checker, x).map(fn).join(),
  }),
);
export default Maybe;
