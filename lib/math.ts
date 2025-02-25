// NOTE not for use with big ints or very long decimals

import { isString } from './js-types';

export const setPrecision = (precision: number, val: number): number => +val.toFixed(precision);

export const round = (decimals: number, val: number): number =>
  Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);

export const roundUp = (decimals: number, val: number): number =>
  Number(Math.ceil(Number(val + 'e' + decimals)) + 'e-' + decimals);

export const roundDown = (decimals: number, val: number) =>
  Number(Math.floor(Number(val + 'e' + decimals)) + 'e-' + decimals);

export const multiply = (v1: number, v2: number): number => {
  const signMult = (v1 < 0 && v2 > 0) || (v2 < 0 && v1 > 0) ? -1 : 1;
  const v1Decimals = countDecimals(v1);
  const v2Decimals = countDecimals(v2);
  const biggerDecimals = Math.max(v1Decimals, v2Decimals);

  // make array of strings to split and fill to same length
  const v1Arr = v1.toFixed(biggerDecimals).split('');
  const v2Arr = v2.toFixed(biggerDecimals).split('');

  if (v1Arr[0] === '-') {
    v1Arr.shift();
  }
  if (v2Arr[0] === '-') {
    v2Arr.shift();
  }
  if (v1Arr.includes('.')) {
    v1Arr.splice(v1Arr.indexOf('.'), 1);
  }
  if (v2Arr.includes('.')) {
    v2Arr.splice(v2Arr.indexOf('.'), 1);
  }

  const result = [];
  let carryNum = 0;
  /*
     1.11
     1.10
     ----
      000
     1110
    11100
    -----
    1.2210
  */
  for (let i = v2Arr.length - 1; i > -1; i--) {
    const row = [];
    result.push(row);

    const currentV2Number = Number(v2Arr[i]);

    // put in the beginning 0s for multiplying past the first digit
    if (i !== v2Arr.length - 1) {
      for (let ii = v2Arr.length - 1; ii > i; ii--) {
        row.push('0');
      }
    }

    // multiply the current v2 number times each of the v1 number's digits from right to left
    for (let j = v1Arr.length - 1; j > -1; j--) {
      const currentV1Number = Number(v1Arr[j]);

      const strAfterCarry = (currentV2Number * Number(currentV1Number) + carryNum).toFixed(0);

      // add the rightmost digit to the answer and save the tens place to carry over
      row.unshift(strAfterCarry.slice(strAfterCarry.length - 1));

      if (strAfterCarry.length > 1) {
        carryNum = Number(strAfterCarry.slice(0, strAfterCarry.length - 1)); // carry val for next iteration
        if (j === 0) {
          row.unshift(carryNum);
          carryNum = 0;
        }
      } else {
        carryNum = 0;
      }
    }
  }

  // turn numbers back and add them as ints
  const intAnswer = result.reduce((accum, val) => {
    return add(accum, Number(val.join('')));
  }, 0);

  // put decimal in place that is double biggerDecimals
  const strArrAnswer = intAnswer.toFixed(0).split('');
  const decimalAt = biggerDecimals * 2;
  const floatAnswer = [
    ...strArrAnswer.slice(0, strArrAnswer.length - decimalAt),
    '.',
    ...strArrAnswer.slice(strArrAnswer.length - decimalAt),
  ];

  return signMult * Number(floatAnswer.join(''));
};

export type BasicMathOperations = 'add' | 'subtract' | 'divide';

export const doMath = (
  type: BasicMathOperations,
  v1: number | string,
  v2: number | string,
): number => {
  // check for scientific notation, convert to decimal
  if (v1.toString().includes('e-')) {
    v1 = convertScientificToDecimal(v1);
  }
  if (v2.toString().includes('e-')) {
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
  } else if (type === 'divide') {
    return tempv1 / tempv2;
  } else {
    return undefined;
  }

  // move decimal back to correct place
  return Number(tempAnswer + 'e-' + biggerDecimals);
};

export const add = (v1: number, v2: number): number => doMath('add', v1, v2);
export const subtract = (v1: number, v2: number): number => doMath('subtract', v1, v2);
export const divide = (v1: number, v2: number): number => doMath('divide', v1, v2);

export const countDecimals = (val: number | string): number => {
  if (!isString(val) && Number(val) % 1 === 0) {
    return 0;
  }
  const strVal = val.toString();
  return strVal.split('.')[1].length;
};

export const convertScientificToDecimal = (num: number | string): number | string => {
  const strNum: string = num.toString().toLowerCase();

  // check for each part of the notation
  const decimalIndex: number = strNum.indexOf('.');

  let eIndex: number = strNum.indexOf('e');

  if (eIndex === -1) {
    return num;
  }

  let exponChars = 1;
  let bigger = true;

  // determine if moving decimal right or left
  if (strNum.indexOf('e+') !== -1) {
    exponChars = 2;
    bigger = true;
  } else {
    // strNum.indexOf('e-') !== -1
    exponChars = 2;
    bigger = false;
  }

  let left: string;
  let right: string;

  // gather the numbers from each side of the decimal
  if (decimalIndex !== -1) {
    left = strNum.slice(0, decimalIndex);
    right = strNum.slice(decimalIndex + 1, eIndex);
  } else {
    left = strNum.slice(0, eIndex);
    right = '';
  }

  // get the exponent
  const expon: number = Number(strNum.slice(eIndex + exponChars, strNum.length));

  let zeroCount: number;
  let newStrNum: string;
  let i: number;

  // add zeros as needed
  if (!bigger) {
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
  }

  return newStrNum;
};
