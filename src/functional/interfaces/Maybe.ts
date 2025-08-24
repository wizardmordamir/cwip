/* eslint-disable */
import { MonadInterface } from './Monad';

export interface MaybeInterface<T> extends MonadInterface<T> {
  passesChecker: () => boolean;
  map: (fn: Function) => MaybeInterface<T>;
  join: () => T;
  chain: (fn: Function) => T;
}
