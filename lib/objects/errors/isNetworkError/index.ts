import { stringIncludesAny } from '../../../js-types';

export const defaultNetworkErrorIndicators = ['ETIMEOUT', 'ENOTFOUND', 'ECONNRESET', 'ESOCKET'];

export const isNetworkError = (
  err,
  networkErrorIndicators: string[] = defaultNetworkErrorIndicators,
) => err && err.message && stringIncludesAny(networkErrorIndicators, err.message);
