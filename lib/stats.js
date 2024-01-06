import { convertBytes, setPrecision } from './conversions';

const os = require('os');

// return load averages for 1 minute, 5 minutes, and 15 minutes at set precision
// return value [number, number, number]
export const loadavg = function (precision) {
  var load = os.loadavg();
  for (var i = 0; i < load.length; i++) {
    load[i] = setPrecision(load[i], precision);
  }
  return load;
};

// return load averages for past minute at set precision
exports.getLoadPastMinute = function () {
  var loadAverages = exports.loadavg(2);
  return loadAverages[0];
};

// get free memory in bytes or converted form
exports.freeMemory = function (convertTo) {
  return convertBytes(os.freemem(), convertTo);
};

// get total memory in bytes or converted form
exports.totalMemory = function (convertTo) {
  return convertBytes(os.totalmem(), convertTo);
};
