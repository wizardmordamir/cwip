/* eslint-disable */
import { Cast, Drop, Length } from '.';

export type Curry<P extends any[], R> = <T extends any[]>(
  ...args: Cast<T, Partial<P>>
) => Drop<Length<T>, P> extends [any, ...any[]]
  ? Curry<Drop<Length<T>, P> extends infer DT ? Cast<DT, any[]> : never, R>
  : R;
