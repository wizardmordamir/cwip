import { curry } from '../flow';

export const setPrecision = (precision: number, val: number): number => +val.toFixed(precision);

export const round = curry(
  (decimals: number, val: number): number => Number(`${Math.round(Number(`${val}e${decimals}`))}e-${decimals}`),
  2,
);

export const roundUp = curry(
  (decimals: number, val: number): number => Number(`${Math.ceil(Number(`${val}e${decimals}`))}e-${decimals}`),
  2,
);

export const roundDown = curry(
  (decimals: number, val: number) => Number(`${Math.floor(Number(`${val}e${decimals}`))}e-${decimals}`),
  2,
);

export const countDecimals = (val: number): number => {
  if (Math.floor(val) === val) return 0;
  const str = convertScientificToDecimal(val); // Ensure flat string
  return str.split('.')[1]?.length || 0;
};

export type BasicMathOperations = 'add' | 'subtract' | 'multiply' | 'divide';

/**
 * Scales a number/string to a BigInt and returns the scale used
 */
const toBigIntScale = (val: number | string) => {
  // 1. Force conversion to a flat decimal string (removes 'e')
  const flatStr = convertScientificToDecimal(val).toString();

  const [int, dec = ''] = flatStr.split('.');
  const scale = dec.length;

  // 2. Combine parts.
  // Handle the case where int is "-0" to ensure BigInt doesn't choke on "-05"
  const combined = int + dec;

  // 3. Final safety: if the result is just "-", treat as "0"
  const sanitized = combined === '' || combined === '-' ? '0' : combined;

  return {
    big: BigInt(sanitized),
    scale,
  };
};

const _doMath = (type: BasicMathOperations, v1: number | string, v2: number | string): number => {
  const n1 = toBigIntScale(v1);
  const n2 = toBigIntScale(v2);

  let resultBig: bigint;
  let resultScale: number;

  switch (type) {
    case 'add':
    case 'subtract': {
      const maxScale = Math.max(n1.scale, n2.scale);
      const b1 = n1.big * BigInt(10 ** (maxScale - n1.scale));
      const b2 = n2.big * BigInt(10 ** (maxScale - n2.scale));
      resultBig = type === 'add' ? b1 + b2 : b1 - b2;
      resultScale = maxScale;
      break;
    }

    case 'multiply': {
      // (1.1 * 1.1) -> (11n * 11n) = 121n. Scale: 1 + 1 = 2 -> 1.21
      resultBig = n1.big * n2.big;
      resultScale = n1.scale + n2.scale;
      break;
    }

    case 'divide': {
      if (n2.big === 0n) return 0;
      // Increase from 20 to 30 to capture the full tail of the conversion
      const precision = 30;
      const b1 = n1.big * BigInt(10 ** (n2.scale + precision));
      const b2 = n2.big * BigInt(10 ** n1.scale);

      resultBig = b1 / b2;
      resultScale = precision;
      break;
    }

    default:
      return 0;
  }

  // Convert BigInt back to a floating point Number via string manipulation
  const s = resultBig.toString();
  const isNegative = s.startsWith('-');
  const absS = isNegative ? s.slice(1) : s;

  // Ensure the string is long enough to insert the decimal at resultScale
  const padded = absS.padStart(resultScale + 1, '0');
  const insertAt = padded.length - resultScale;

  const finalStr = `${(isNegative ? '-' : '') + padded.slice(0, insertAt)}.${padded.slice(insertAt)}`;

  return parseFloat(finalStr);
};

export const doMath = curry(_doMath, 3) as {
  (
    type: BasicMathOperations,
  ): {
    (v1: number | string): (v2: number | string) => number;
    (v1: number | string, v2: number | string): number;
  };
  (type: BasicMathOperations, v1: number | string): (v2: number | string) => number;
  (type: BasicMathOperations, v1: number | string, v2: number | string): number;
};

export const add = curry((amt, val) => doMath('add', val, amt), 2);
export const subtract = curry((amt, val) => doMath('subtract', val, amt), 2);
export const multiply = curry((factor, val) => doMath('multiply', val, factor), 2);
export const divide = curry((divisor, val) => doMath('divide', val, divisor), 2);

// Usage: [1, 2, 3].map(add(10)) -> [11, 12, 13]

export const convertScientificToDecimal = (num: number | string): string => {
  const str = num.toString();
  if (!str.includes('e')) return str;

  const [base, expStr] = str.split('e');
  const exp = parseInt(expStr, 10);
  const [integer, fraction = ''] = base.split('.');

  if (exp > 0) {
    // Moving decimal right
    const combined = integer + fraction.padEnd(exp, '0');
    const newInt = combined.slice(0, integer.length + exp);
    const newDec = combined.slice(integer.length + exp);

    // Polish: Remove leading zeros from integers unless the result is "0"
    const result = newDec ? `${newInt}.${newDec}` : newInt;
    return result.replace(/^0+(?=\d)/, '');
  } else {
    // Moving decimal left
    const absExp = Math.abs(exp);
    const isNegative = integer.startsWith('-');
    const absInteger = isNegative ? integer.slice(1) : integer;

    // Polish: Already included here - the "0." prefix ensures standard format
    return `${isNegative ? '-' : ''}0.${'0'.repeat(absExp - 1)}${absInteger}${fraction}`;
  }
};
