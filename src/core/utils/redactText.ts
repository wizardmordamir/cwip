import { isString } from '../is';

export const redactText = ({
  str = '',
  num = 0,
  redactionText = '[REDACTED]',
}: {
  str: string;
  num?: number;
  redactionText?: string;
}): string => {
  if (!isString(str)) {
    return redactionText;
  }
  if (str.length <= num * 2) {
    return redactionText;
  }
  return `${str.slice(0, num)}${redactionText}${str.slice(str.length - num)}`;
};
