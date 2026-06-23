export const compose =
  (...fns: any[]) =>
  (...args: any[]) =>
    // biome-ignore lint: allowing spread operator for better readability
    fns.reduceRight((res, fn) => [fn.call(null, ...res)], args)[0];

export default compose;
