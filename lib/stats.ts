import { ConvertType, convertBytesTo } from './byteConversions';
import { setPrecision } from './math';
import os from 'os';

const defaultPrecision = 8;

// return load averages for 1 minute, 5 minutes, and 15 minutes at set precision
// only ever [0, 0, 0] on Windows os
export const loadAvg = function (precision: number = defaultPrecision): number[] {
  return os.loadavg().map((load) => setPrecision(precision, load));
};

// return load averages for past minute at set precision
export const getLoadPastMinute = function (precision: number = defaultPrecision): number {
  return setPrecision(precision, os.loadavg()[0]);
};

// get free memory in bytes or converted, ex. 2737586176
export const freeMemory = function (convertType: ConvertType = 'bytes') {
  return convertBytesTo(os.freemem(), convertType);
};

// get total memory in bytes or converted
export const totalMemory = function (convertTo: ConvertType = 'bytes') {
  return convertBytesTo(os.totalmem(), convertTo);
};
