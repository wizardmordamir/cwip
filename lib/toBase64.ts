export const toBase64 = (input: string): string => Buffer.from(input).toString('base64');
export const fromBase64 = (input: string): string => Buffer.from(input, 'base64').toString('utf-8');

export const isBase64 = (input: string): boolean => {
  try {
    return btoa(atob(input)) === input;
  } catch (e) {
    return false;
  }
};
