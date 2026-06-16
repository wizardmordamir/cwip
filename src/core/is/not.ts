export const not = (fn: (v: any) => boolean) => (v: any) => !fn(v);
