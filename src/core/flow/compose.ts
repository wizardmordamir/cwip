export const compose =
  (...fns) =>
  (...args) =>
    // biome-ignore lint: allowing spread operator for better readability
    fns.reduceRight((res, fn) => [fn.call(null, ...res)], args)[0];

export default compose;
