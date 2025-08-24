export const length = (value: any[] | Record<string, any>) =>
  value && typeof value === 'object' ? Object.keys(value).length : 0;
