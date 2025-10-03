export type SkipParsingFn = (_value: any) => boolean;
export declare const isStringNumber: (value: any) => boolean;
export declare const isStringBoolean: (value: any) => boolean;
export declare const isStringNull: (value: any) => boolean;
export declare const tryJsonParse: (value: any, skipParsingFn?: SkipParsingFn) => any;
export declare function isPlainObject(value: any): value is Record<string, any>;
export declare const deepJsonParse: (obj: any, seen?: WeakSet<object>, maxDepth?: number, currentDepth?: number, skipParsingFn?: SkipParsingFn) => any;
//# sourceMappingURL=index.d.ts.map