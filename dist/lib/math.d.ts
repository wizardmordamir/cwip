export declare const setPrecision: (precision: number, val: number) => number;
export declare const round: (decimals: number, val: number) => number;
export declare const roundUp: (decimals: number, val: number) => number;
export declare const roundDown: (decimals: number, val: number) => number;
export declare const multiply: (v1: number, v2: number) => number;
type Operations = 'add' | 'subtract' | 'divide';
export declare const doMath: (type: Operations, v1: number | string, v2: number | string) => number;
export declare const add: (v1: number, v2: number) => number;
export declare const subtract: (v1: number, v2: number) => number;
export declare const divide: (v1: number, v2: number) => number;
export declare const countDecimals: (val: number | string) => number;
export declare const convertScientificToDecimal: (num: number | string) => number | string;
export {};
//# sourceMappingURL=math.d.ts.map