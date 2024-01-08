import { curry } from './functional';

// NOTE does not currently work with big ints or very long decimals

export const round = curry((decimals, val) =>
  Number(Math.round(val + 'e' + decimals) + 'e-' + decimals),
);

export const roundUp = curry((decimals, val) =>
  Number(Math.ceil(val + 'e' + decimals) + 'e-' + decimals),
);

export const roundDown = curry((decimals, val) =>
  Number(Math.floor(val + 'e' + decimals) + 'e-' + decimals),
);

const validDoMathTypes = ['add', 'subtract', 'divide'];

export const multiply = (v1, v2) => {
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
  // vLess.concat(Array(biggerDecimals - v2Decimals).fill(0));
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

    const vs = Number(v2Arr[i]);

    if (i !== v2Arr.length - 1) {
      for (let ii = v2Arr.length - 1; ii > i; ii--) {
        row.push('0');
      }
    }

    for (let j = v1Arr.length - 1; j > -1; j--) {
      if (v1Arr[j] === '.') {
        continue;
      }

      const vl = Number(v1Arr[j]);

      const strAfterCarry = (vs * Number(v1Arr[j]) + carryNum).toFixed(0);

      row.unshift(strAfterCarry.slice(strAfterCarry.length - 1));

      if (strAfterCarry.length > 1) {
        carryNum = Number(strAfterCarry.slice(0, strAfterCarry.length - 1)); // carry val for next iteration
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

export const doMath = (type, v1, v2) => {
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
  } else if (type === 'divide') {
    return tempv1 / tempv2;
  }

  // move decimal back to correct place
  const strNum = tempAnswer.toString().toLowerCase();

  if (strNum.includes('e+')) {
    const vals = strNum.split('e+');
    let end;
    if (vals[1] > biggerDecimals) {
      end = 'e+' + (Number(vals[1]) - biggerDecimals);
    } else {
      end = 'e-' + (biggerDecimals - Number(vals[1]));
    }
    console.log('vals[0]:', vals[0], ', end:', end);
    return Number(vals[0] + end);
  }

  return Number(tempAnswer + 'e-' + biggerDecimals);
};

export const add = (v1, v2) => doMath('add', v1, v2);
export const subtract = (v1, v2) => doMath('subtract', v1, v2);
// export const multiply = (v1, v2) => doMath('multiply', v1, v2);
export const divide = (v1, v2) => doMath('divide', v1, v2);

export const countDecimals = function (val) {
  if (val % 1 === 0) {
    return 0;
  }
  return val.toString().split('.')[1].length;
};

export const convertScientificToDecimal = function (num) {
  const strNum = num.toString().toLowerCase();

  // check for each part of the notation
  const decimalIndex = strNum.indexOf('.');
  let eIndex = strNum.indexOf('e-');
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
