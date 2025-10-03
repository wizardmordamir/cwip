import { stringIncludesAny } from '../../../js-types';

export const defaultNetworkErrorIndicators = [
  'ETIMEOUT',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNRESET',
  'ESOCKET',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ENETRESET',
  'ENETUNREACH',
  'EAI_AGAIN',
  'EPIPE',
  'ECONNABORTED',
  'EADDRINUSE',
  'EADDRNOTAVAIL',
  'EHOSTDOWN',
  'ENOTCONN',
  'ESHUTDOWN',
];

export const isNetworkError = (
  err,
  networkErrorIndicators: string[] = defaultNetworkErrorIndicators,
) => {
  if (!err || typeof err !== 'object') return false;

  if ('code' in err && typeof err.code === 'string') {
    return networkErrorIndicators.includes(err.code);
  }

  if (!('message' in err) || typeof err.message !== 'string') return false;

  return stringIncludesAny(networkErrorIndicators, err.message);
};
