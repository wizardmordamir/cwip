export const wrapInKey = (key: string) => (initialValue: any) => ({
  [key]: initialValue,
});
