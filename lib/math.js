export const round = (value, decimals = 0) =>
  Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);

export const roundUp = (value, decimals = 0) =>
  Number(Math.ceil(value + 'e' + decimals) + 'e-' + decimals);

export const roundDown = (value, decimals = 0) =>
  Number(Math.floor(value + 'e' + decimals) + 'e-' + decimals);

const validDoMathTypes = ['add', 'subtract', 'multiply'];

export const doMath = (type, v1, v2) => {
  if (validDoMathTypes.includes(type)) {
    throw new Error(`doMath uses types: ${validDoMathTypes}, but received: ${type}`);
  }
  if (isNaN(v1) || isNaN(v2)) {
    throw new Error(
      'utility.doMath only accepts numbers, but received v1 ' +
        v1 +
        ' of type ' +
        typeof v1 +
        ' and v2 ' +
        v2 +
        ' of type ' +
        typeof v2,
    );
  }

  // check for scientific notation, convert to decimal
  if (v1.toString().includes('e-') !== -1) {
    v1 = convertScientificToDecimal(v1);
  }
  if (v2.toString().includes('e-') !== -1) {
    v2 = convertScientificToDecimal(v2);
  }

  const v1Decimals = countDecimals(v1);
  const v2Decimals = countDecimals(v2);
  const biggerDecimals = Math.max(v1Decimals, v2Decimals);

  // convert both values to integers
  const tempv1 = Number(v1 + 'e' + biggerDecimals);
  const tempv2 = Number(v2 + 'e' + biggerDecimals);

  let tempAnswer;
  if (type === 'subtract') {
    tempAnswer = tempv1 - tempv2;
  } else if (type === 'add') {
    tempAnswer = tempv1 + tempv2;
  } else if (type === 'multiply') {
    tempAnswer = tempv1 * tempv2;
  } else if (type === 'divide') {
    tempAnswer = tempv1 / tempv2;
  }

  // move decimal back to correct place
  return Number(tempAnswer + 'e-' + biggerDecimals);
};

export const add = (v1, v2) => doMath('add', v1, v2);
export const subtract = (v1, v2) => doMath('subtract', v1, v2);
export const multiply = (v1, v2) => doMath('multiply', v1, v2);
export const division = (v1, v2) => doMath('divide', v1, v2);

export const countDecimals = function (value) {
  if (value % 1 === 0) {
    return 0;
  }
  return value.toString().split('.')[1].length;
};

export const convertScientificToDecimal = function (num) {
  if (isNaN(num)) {
    throw new Error('The value ' + num + ' is not a number, type:', typeof num);
  }

  const strNum = num.toString().toLowerCase();

  // check for each part of the notation
  const decimalIndex = strNum.indexOf('.');
  const eIndex = strNum.indexOf('e-');
  let exponChars;

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

  let left, right;

  // gather the numbers from each side of the decimal
  if (decimalIndex !== -1) {
    left = strNum.slice(0, decimalIndex);
    right = strNum.slice(decimalIndex + 1, eIndex);
  } else {
    left = strNum.slice(0, eIndex);
    right = '';
  }

  // get the exponent
  const expon = strNum.slice(eIndex + exponChars, strNum.length);

  let zeroCount, newStrNum, i;

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
