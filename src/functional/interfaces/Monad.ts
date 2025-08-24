/* eslint-disable */
import { FunctorInterface } from './Functor';

export interface MonadInterface<T> extends FunctorInterface<T> {
  map: (f: Function) => MonadInterface<T>;
  join: () => T;
  chain: (f: Function) => T;
}
