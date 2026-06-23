export const pipe =
  (...fns: any[]) =>
  (...args: any[]) =>
    // biome-ignore lint: allowing spread operator for better readability
    fns.reduce((res, fn) => [fn.call(null, ...res)], args)[0];

export default pipe;
