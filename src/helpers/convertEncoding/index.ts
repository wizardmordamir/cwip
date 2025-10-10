export const isBase64 = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  try {
    return btoa(atob(input)) === input;
  } catch (e) {
    return false;
  }
};

export const convertEncoding = (
  input: string,
  fromEncoding: BufferEncoding,
  toEncoding: BufferEncoding,
): string => Buffer.from(input, fromEncoding).toString(toEncoding);

export const toBase64 = (input: string): string => convertEncoding(input, 'utf-8', 'base64');
export const fromBase64 = (input: string): string => convertEncoding(input, 'base64', 'utf-8');
