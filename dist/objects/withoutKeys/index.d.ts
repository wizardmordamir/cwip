type WithoutKeys<T, K extends string> = {
    [P in keyof T as P extends K ? never : P]: T[P];
};
export declare const withoutKeys: <T extends Record<string, any>, K extends string>(obj: T, keys: K[]) => WithoutKeys<T, K>;
export {};
//# sourceMappingURL=index.d.ts.map