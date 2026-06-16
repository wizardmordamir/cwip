// Overloads for type inference based on function chain
export function pipeAsync<A, B>(fn1: (a: A) => Promise<B> | B): (a: A) => Promise<B>;
export function pipeAsync<A, B, C>(fn1: (a: A) => Promise<B> | B, fn2: (b: B) => Promise<C> | C): (a: A) => Promise<C>;
export function pipeAsync<A, B, C, D>(
  fn1: (a: A) => Promise<B> | B,
  fn2: (b: B) => Promise<C> | C,
  fn3: (c: C) => Promise<D> | D,
): (a: A) => Promise<D>;
export function pipeAsync<A, B, C, D, E>(
  fn1: (a: A) => Promise<B> | B,
  fn2: (b: B) => Promise<C> | C,
  fn3: (c: C) => Promise<D> | D,
  fn4: (d: D) => Promise<E> | E,
): (a: A) => Promise<E>;
export function pipeAsync<A, B, C, D, E, F>(
  fn1: (a: A) => Promise<B> | B,
  fn2: (b: B) => Promise<C> | C,
  fn3: (c: C) => Promise<D> | D,
  fn4: (d: D) => Promise<E> | E,
  fn5: (e: E) => Promise<F> | F,
): (a: A) => Promise<F>;
// Fallback for more than 5 functions
export function pipeAsync(...fns: ((_value: any) => any)[]): (initialValue: any) => Promise<any>;

// Implementation
export function pipeAsync(...fns: ((_value: any) => any)[]) {
  return (initialValue: any): Promise<any> => {
    let result: Promise<any> = Promise.resolve(initialValue);
    for (const fn of fns) {
      result = result.then(fn);
    }
    return result;
  };
}
