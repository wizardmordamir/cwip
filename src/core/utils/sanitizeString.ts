export const sanitizeString = ({ sanitize, str }: { sanitize: (str: string) => string; str: string }): string => {
  if (!str) {
    return '';
  }

  return sanitize(str) || '';
};
