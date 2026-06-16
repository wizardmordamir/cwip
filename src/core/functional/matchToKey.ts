export const matchToKey = (key: string) => (v: any) => (list: any[]) => list.find((item: any) => item[key] === v[key]);
