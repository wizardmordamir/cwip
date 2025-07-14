import { ConvertType, convertBytesTo } from './byteConversions';
import { setPrecision } from './math';

const isNode =
  typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

let os: typeof import('os') | undefined;
if (isNode) {
  const loadOs = async () => {
    os = await import('os');
  };
  loadOs();
}

const defaultPrecision = 8;
const envErrorMessage = 'stats are only available in Node.js';

// return load averages for 1 minute, 5 minutes, and 15 minutes at set precision
// only ever [0, 0, 0] on Windows os
export const loadAvg = function (precision: number = defaultPrecision): number[] {
  if (!isNode || !os) throw new Error(envErrorMessage);
  return os.loadavg().map((load) => setPrecision(precision, load));
};

// return load averages for past minute at set precision
export const getLoadPastMinute = function (precision: number = defaultPrecision): number {
  if (!isNode || !os) throw new Error(envErrorMessage);
  return setPrecision(precision, os.loadavg()[0]);
};

// get free memory in bytes or converted, ex. 2737586176
export const freeMemory = function (convertType: ConvertType = 'bytes') {
  if (!isNode || !os) throw new Error(envErrorMessage);
  return convertBytesTo(os.freemem(), convertType);
};

// get total memory in bytes or converted
export const totalMemory = function (convertTo: ConvertType = 'bytes') {
  if (!isNode || !os) throw new Error(envErrorMessage);
  return convertBytesTo(os.totalmem(), convertTo);
};
