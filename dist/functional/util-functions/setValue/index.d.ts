type SetValue = <P extends object, R extends object>(setter: (v?: P) => R) => (value: P) => P & R;
export declare const setValue: SetValue;
export {};
//# sourceMappingURL=index.d.ts.map