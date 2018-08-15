/**
 * Generic and commonly used functions
 */

const os = require('os');
const fs = require('fs');
const moment = require('moment');
const math = require('mathjs');
const _ = require('lodash')

// number of bytes in a GB
const bytesInGB = 1073741824;

// check for expected properties in obj
exports.propsExist = function (obj, properties) {
  try {
    if (!_.isObject(obj)) throw new Error('expected object with keys: ' + JSON.stringify(properties) + ' instead of: ' + JSON.stringify(obj))
    let missing = exports.missingKeys(obj, properties)
    if (missing) {
      throw new Error('missing keys ' + JSON.stringify(missing) + ' in: ' + JSON.stringify(obj))
    }
    return true
  } catch (e) {
    console.error(e.stack)
  }
}

exports.missingKeys = function (obj, keys) {
	var missing = []
	for (var i = 0; i < keys.length; i++) {
		if (typeof obj[keys[i]] == 'undefined') {
			missing.push(keys[i]);
		}
	}
	if (missing.length) {
		return missing;
	}
	return false;
}

// return load averages for 1 minute, 5 minutes, and 15 minutes at set precision
// return value [number, number, number]
exports.loadavg = function (precision) {
	var load = os.loadavg();
	for (var i = 0; i < load.length; i++) {
		load[i] = setPrecision(load[i], precision);
	}
	return load;
}

// return load averages for past minute at set precision
exports.getLoadPastMinute = function () {
  var loadAverages = exports.loadavg(2);
  return loadAverages[0];
}

// get free memory in bytes or converted form
exports.freeMemory = function (convertTo) {
	return convertBytes(os.freemem(), convertTo);
}

// get total memory in bytes or converted form
exports.totalMemory = function (convertTo) {
	return convertBytes(os.totalmem(), convertTo);
}

function setPrecision (val, precision) {
	if (!precision && precision !== 0) {
		return val;
	}
	return val.toFixed(precision);
}

function convertBytes (bytes, type, precision) {
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

// return true if all keys in obj are empty or empty arrays
exports.allKeysEmpty = function (obj) {
    var keys = Object.getOwnPropertyNames(obj);
    for (var i = 0; i < keys.length; i++ ) {
    	if(Array.isArray(obj[keys[i]])) {
			if (obj[keys[i]].length) {
				break;
			}
    	} else {
    		if (obj[keys[i]]) {
    			break;
    		}
    	}
		// all keys empty
		if (i === keys.length - 1) {
			return true;
		}
    }
    return false;
}
// return number of keys in object
exports.keysCount = function (obj, skipHasOwnProperty) {
  var count = 0;
  if (skipHasOwnProperty) {
    for (var key in obj) {
      ++count;
    }
  } else {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        ++count;
      }
    }
  }
  return count;
}

/**
 * format current time or date object, ex. "09-07-15, 5:45:16.321 pm"
 * if null is passed in, it returns the current date time
 */
exports.getTime = function (dateObject) {
  return moment(dateObject).format("MM-DD-YY h:mm:ss a"); // h:mm:ss.SSS
};

/**
 * round a number down with a specified number of decimals left over
 */
exports.round = function (value, decimals) {
  decimals = decimals || 0;
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

/**
 * round a number up with a specified number of decimals left over
 */
exports.roundUp = function (value, decimals) {
  decimals = decimals || 0;
  return Number(Math.ceil(value+'e'+decimals)+'e-'+decimals);
};

/**
 * round a number down with a specified number of decimals left over
 */
exports.roundDown = function (value, decimals) {
  decimals = decimals || 0;
  return Number(Math.floor(value+'e'+decimals)+'e-'+decimals);
};

// subtract using integers to avoid things like 0.000131 - 0.000022 equaling 0.00010900000000000002 instead of 0.000109
exports.doMath = function (type, val1, val2) {
  var types = ['add', 'subtract'];
  if (types.indexOf(type) === -1) {
    throw new Error('utility.doMath requires one of these types: ' + types + ', but received type: ' + type);
  }
  if (isNaN(val1) || isNaN(val2)) {
    throw new Error('utility.doMath only accepts numbers, but received val1 ' + val1 + ' of type ' + typeof(val1) + ' and val2 ' + val2 + ' of type ' + typeof(val2));
  }

  var stringValue1 = val1.toString();
  var stringValue2 = val2.toString();

  // check for scientific notation, convert to decimal
  if (stringValue1.indexOf('e-') !== -1) {
    val1 = exports.convertScientificToDecimal(val1);
  }
  if (stringValue2.indexOf('e-') !== -1) {
    val2 = exports.convertScientificToDecimal(val2);
  }

  var val1Decimals = exports.countDecimals(val1);
  var val2Decimals = exports.countDecimals(val2);

  var biggerDecimals = Math.max(val1Decimals, val2Decimals);

  // convert both values to integers
  var tempVal1 = Number(val1 + 'e' + biggerDecimals);
  var tempVal2 = Number(val2 + 'e' + biggerDecimals);

  var tempAnswer;

  if (type === 'subtract') {
    tempAnswer = tempVal1 - tempVal2;
  } else if (type === 'add') {
    tempAnswer = tempVal1 + tempVal2;
  }

  // move decimal back to correct place
  return Number(tempAnswer  + 'e-' + biggerDecimals);
};

exports.countDecimals = function (value) {
  if ((value % 1) !== 0) {
    return value.toString().split(".")[1].length;
  }
  return 0;
};

function copyFile(source, target, cb) {
  var cbCalled = false;
  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (err) {
      console.error('err: ' + JSON.stringify(err));
    }
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

// copy file, calls a callback
exports.copyFileCb = function (source, target, cb) {
  var cbCalled = false;
  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (err) {
      console.error('[utility.js] copyFileCb error: ' + JSON.stringify(err));
    }
    if (cb && !cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
};

// copy file, returns a promise
exports.copyFile = function (source, target) {
  return new Promise(function(resolve, reject) {
    var rd = fs.createReadStream(source);
    rd.on('error', rejectCleanup);
    var wr = fs.createWriteStream(target);
    wr.on('error', rejectCleanup);
    function rejectCleanup(err) {
      rd.destroy();
      wr.end();
      reject(new Error(err));
    }
    wr.on('finish', function () {
      resolve();
    });
    rd.pipe(wr);
  });
};

var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
exports.getDaysBetween = function (firstDate, secondDate) {
  // add one to result to include partial day
  return Math.floor(Math.abs((firstDate.getTime() - secondDate.getTime()) / (oneDay)));
};

exports.getMsBetween = function (firstDate, secondDate) {
  try {
    var result = Math.floor(Math.abs((firstDate.getTime() - secondDate.getTime())));
    return result;
  } catch (err) {
    console.log('firstDate: '  + firstDate + ', secondDate: ' + secondDate);
    console.error(err.stack);
  }
};

/*
 * returns time since a passed in date object
 */
exports.getTimeSince = function (pastDateObject) {
  if (!pastDateObject) {
    return;
  }
  var timeAgo, seconds, minutes;
  var msInSecond = 1000;
  var msInMinute = 60000;
  var msInHour = 3600000;
  var msInDay = 86400000;
  var now = new Date();
  var msBetween = exports.getMsBetween(now, pastDateObject);
  if (msBetween <= msInMinute) {
    timeAgo = (Math.floor(msBetween / msInSecond)) + ' secs';
  } else if (msBetween <= msInHour) {
    timeAgo = (Math.floor(msBetween / msInMinute)) + ' mins';
  } else if (msBetween <= msInDay) {
    timeAgo = (Math.floor(msBetween / msInHour)) + ' hrs';
  } else {
    timeAgo = (Math.floor(msBetween / msInDay)) + ' days';
  }
  return timeAgo;
};

exports.truncateFile = async function (path, start) {
  start = start || 0;
  return new Promise(function (resolve) {
    fs.truncate(path, start, function (err) {
      resolve();
    });
  });
};

exports.readFile = async function (path) {
  try {
    return new Promise(function (resolve, reject) {
      fs.readFile(path, function (err, data) {
        if (err) {
          reject(new Error(err));
        } else {
          resolve(data);
        }
      });
    });
  } catch (err) {
    console.error(err.stack);
  }
};

/**
 * convert scientific notation to decimal
 */
exports.convertScientificToDecimal = function (value) {
  if (isNaN(value)) {
    throw new Error('The value ' + value + ' is not a number');
  }

  strNum = value.toString().toLowerCase();

  // check for each part of the notation
  var decimalIndex = strNum.indexOf('.');
  var eIndex = strNum.indexOf('e-');
  var exponChars;

  // determine if moving decimal right or left
  if (eIndex === -1) {
    eIndex = strNum.indexOf('e');
    exponChars = 1;
  } else {
    exponChars = 2;
  }

  if (eIndex === -1) {
    return num;
  }

  var left, right;

  // gather the numbers from each side of the decimal
  if (decimalIndex !== -1) {
    left = strNum.slice(0, decimalIndex);
    right = strNum.slice(decimalIndex + 1, eIndex);
  } else {
    left = strNum.slice(0, eIndex);
    right = '';
  }

  // get the exponent
  var expon = strNum.slice(eIndex + exponChars, strNum.length);

  var zeroCount, newStrNum, i;

  // add zeros as needed
  if (exponChars === 2) {
    zeroCount = expon - left.length;
    newStrNum = '.';
    for (i = 0; i < zeroCount; i++) {
      newStrNum += '0'
    }
    newStrNum += left + right;
  } else {
    zeroCount = expon - right.length;
    newStrNum = left + right;
    for (i = 0; i < zeroCount; i++) {
      newStrNum += '0'
    }
    newStrNum += left + right;
  }

  return newStrNum;
};

exports.firstExisting = function (obj, prop1, prop2) {
  if (obj) {
    if (obj[prop1] || obj[prop1] === 0) {
      return obj[prop1];
    } else {
      return obj[prop2];
    }
  }
};

exports.hexIfBuffer = function (buffer) {
  if (buffer instanceof Buffer) {
    return buffer.toString('hex');
  } else {
    return buffer;
  }
};

exports.randAlphNum = function (len) {
  let result = '';
  let options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for(let i = 0; i < len; i++) {
    result += options.charAt(Math.floor(Math.random() * options.length));
  }
  return result;
}

exports.sleep = async function (ms) {
  return new Promise(r => setTimeout(r, ms));
}

// return a date the passed in number of ms prior to now
exports.getDateMinusMs = function (ms) {
  return new Date(new Date().getTime() - ms);
};

// return true if passed date is earlier than now minus passed ms
exports.isDateOlderMs = function (dateObj, ms) {
  return dateObj < exports.getDateMinusMs(ms);
};

// Allow JSON.stringify to work on objects with circular references
exports.fixCircular = function (o) {
  var cache = [];
  return JSON.stringify(o, function(k, v) {
    if (typeof v === 'object' && v !== null) {
      if (cache.indexOf(v) !== -1) {
        return;
      }
      cache.push(v);
    }
    return v;
  }, 4); // args -> object to stringify, props to show, number of spaces for readability
};

exports.subRound8 = function (v1, v2) {
  try {
    if (isNaN(v1) || isNaN(v2)) {
      console.log('v1: ' + v1 + ', v2: ' + v2);
    }
    return math.round(math.subtract(v1, v2), 8);
  } catch (err) {
    console.error(err.stack);
  }
}
exports.addRound8 = function (v1, v2) {
  try {
    if (isNaN(v1) || isNaN(v2)) {
      console.log('v1: ' + v1 + ', v2: ' + v2);
    }
    return math.round(math.add(v1, v2), 8);
  } catch (err) {
    console.error(err.stack);
  }
}
