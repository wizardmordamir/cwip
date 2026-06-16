// type AnyFunc = (...args: any[]) => any;

// // --- OVERLOAD SIGNATURES ---
// // 2 Arguments
// export function curry<A, B, R>(
//   fn: (a: A, b: B) => R,
// ): {
//   (a: A): (b: B) => R;
//   (a: A, b: B): R;
// };

// // 3 Arguments
// export function curry<A, B, C, R>(
//   fn: (a: A, b: B, c: C) => R,
// ): {
//   (a: A): { (b: B): (c: C) => R; (b: B, c: C): R };
//   (a: A, b: B): (c: C) => R;
//   (a: A, b: B, c: C): R;
// };

// // 4 Arguments
// export function curry<A, B, C, D, R>(
//   fn: (a: A, b: B, c: C, d: D) => R,
// ): {
//   (
//     a: A,
//   ): {
//     (b: B): { (c: C): (d: D) => R; (c: C, d: D): R };
//     (b: B, c: C): (d: D) => R;
//     (b: B, c: C, d: D): R;
//   };
//   (a: A, b: B): { (c: C): (d: D) => R; (c: C, d: D): R };
//   (a: A, b: B, c: C): (d: D) => R;
//   (a: A, b: B, c: C, d: D): R;
// };

// // 5 Arguments
// export function curry<A, B, C, D, E, R>(
//   fn: (a: A, b: B, c: C, d: D, e: E) => R,
// ): {
//   (
//     a: A,
//   ): {
//     (
//       b: B,
//     ): {
//       (c: C): { (d: D): (e: E) => R; (d: D, e: E): R };
//       (c: C, d: D): (e: E) => R;
//       (c: C, d: D, e: E): R;
//     };
//     (b: B, c: C): { (d: D): (e: E) => R; (d: D, e: E): R };
//     (b: B, c: C, d: D): (e: E) => R;
//     (b: B, c: C, d: D, e: E): R;
//   };
//   (
//     a: A,
//     b: B,
//   ): {
//     (c: C): { (d: D): (e: E) => R; (d: D, e: E): R };
//     (c: C, d: D): (e: E) => R;
//     (c: C, d: D, e: E): R;
//   };
//   (a: A, b: B, c: C): { (d: D): (e: E) => R; (d: D, e: E): R };
//   (a: A, b: B, c: C, d: D): (e: E) => R;
//   (a: A, b: B, c: C, d: D, e: E): R;
// };

export type Curried<T extends any[], R> = T extends [infer Head, ...infer Tail]
  ? Tail extends []
    ? (arg: Head) => R
    : ((arg: Head) => Curried<Tail, R>) & ((...args: T) => R) // Supports both (a)(b) and (a, b)
  : () => R;

export function curry<T extends any[], R>(fn: (...args: T) => R, arity: number = fn.length): Curried<T, R> {
  return function curried(...args: any[]): any {
    if (args.length >= arity) {
      return fn.apply(null, args as unknown as T);
    }
    return (...rest: any[]) => curried.apply(null, args.concat(rest));
  } as Curried<T, R>;
}
