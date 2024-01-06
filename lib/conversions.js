// number of bytes in a GB
const bytesInGB = 1073741824;

function setPrecision(val, precision) {
  if (!precision && precision !== 0) {
    return val;
  }
  return val.toFixed(precision);
}

function convertBytes(bytes, type, precision) {
  if (!type) {
    return bytes;
  }
  if (!precision && precision !== 0) {
    precision = 2;
  }
  if (type === 'GB') {
    return setPrecision(bytes / bytesInGB, precision);
  } else {
    return 'unrecognized type for conversion from bytes';
  }
}

module.exports = {
  bytesInGB,
  setPrecision,
  convertBytes,
};
