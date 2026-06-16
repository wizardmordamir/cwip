export const takeKeyA = (key: string) => async (x: any) => await x[key];

/* original fn version
export const takeKeyA = (key: string, fn: (x: any) => any) => async (x: any) => await fn(x[key]);
*/
