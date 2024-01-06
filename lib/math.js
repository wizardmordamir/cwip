/**
 * round a number down with a specified number of decimals left over
 */
exports.round = function (value, decimals) {
  decimals = decimals || 0;
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
};

/**
 * round a number up with a specified number of decimals left over
 */
exports.roundUp = function (value, decimals) {
  decimals = decimals || 0;
  return Number(Math.ceil(value + 'e' + decimals) + 'e-' + decimals);
};

/**
 * round a number down with a specified number of decimals left over
 */
exports.roundDown = function (value, decimals) {
  decimals = decimals || 0;
  return Number(Math.floor(value + 'e' + decimals) + 'e-' + decimals);
};

// subtract using integers to avoid things like 0.000131 - 0.000022 equaling 0.00010900000000000002 instead of 0.000109
exports.doMath = function (type, val1, val2) {
  var types = ['add', 'subtract'];
  if (types.indexOf(type) === -1) {
    throw new Error('utility.doMath requires one of these types: ' + types + ', but received type: ' + type);
  }
  if (isNaN(val1) || isNaN(val2)) {
    throw new Error('utility.doMath only accepts numbers, but received val1 ' + val1 + ' of type ' + typeof val1 + ' and val2 ' + val2 + ' of type ' + typeof val2);
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
  return Number(tempAnswer + 'e-' + biggerDecimals);
};

exports.countDecimals = function (value) {
  if (value % 1 !== 0) {
    return value.toString().split('.')[1].length;
  }
  return 0;
};

/**
 * convert scientific notation to decimal
 */
exports.convertScientificToDecimal = function (num) {
  if (isNaN(num)) {
    throw new Error('The value ' + num + ' is not a number');
  }

  const strNum = num.toString().toLowerCase();

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
      newStrNum += '0';
    }
    newStrNum += left + right;
  } else {
    zeroCount = expon - right.length;
    newStrNum = left + right;
    for (i = 0; i < zeroCount; i++) {
      newStrNum += '0';
    }
    newStrNum += left + right;
  }

  return newStrNum;
};

// TODO
const add = (exports.add = () => {});
// TODO
const subtract = (exports.subtract = () => {});

exports.subRound8 = function (v1, v2) {
  try {
    if (isNaN(v1) || isNaN(v2)) {
      console.log('v1: ' + v1 + ', v2: ' + v2);
    }
    return Math.round(subtract(v1, v2), 8);
  } catch (err) {
    console.error(err.stack);
  }
};

exports.addRound8 = function (v1, v2) {
  try {
    if (isNaN(v1) || isNaN(v2)) {
      console.log('v1: ' + v1 + ', v2: ' + v2);
    }
    return Math.round(add(v1, v2), 8);
  } catch (err) {
    console.error(err.stack);
  }
};
