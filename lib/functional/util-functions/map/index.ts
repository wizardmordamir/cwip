export const map = (fn: Function) => (x) => {
  return x.map(fn);
};

export default { map };
