export const pipe =
  (...fns) =>
  (...args) =>
    fns.reduce((res, fn) => [fn.call(null, ...res)], args)[0];

export default pipe;
