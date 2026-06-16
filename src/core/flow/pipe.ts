export const pipe =
  (...fns) =>
  (...args) =>
    // biome-ignore lint: allowing spread operator for better readability
    fns.reduce((res, fn) => [fn.call(null, ...res)], args)[0];

export default pipe;
