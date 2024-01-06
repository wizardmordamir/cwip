import { curry } from './functional';

// number of bytes in a GB
export const bytesInGB = 1073741824;

export const setPrecision = curry((precision, val) => +val.toFixed(precision));

export const convertBytesToGB = (bytes) => bytes / bytesInGB;
