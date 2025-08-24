export declare class ComposableObject {
    static keys: import("../../typescriptUtils").Curry<[fn: (value: string, index: number, array: string[]) => any, object: Record<string, any>], string[]>;
    static values: import("../../typescriptUtils").Curry<[fn: (value: unknown, index: number, array: unknown[]) => any, object: Record<string, any>], unknown[]>;
    static entries: import("../../typescriptUtils").Curry<[fn: (value: [string, any], index: number, array: [string, any][]) => any, object: Record<string, any>], [string, unknown][]>;
    static mergeObjects: import("../../typescriptUtils").Curry<[overridingObject: Record<string, any>, baseObject: Record<string, any>], object>;
    static fromEntries: (entries: Iterable<readonly [PropertyKey, any]>) => Record<string, any>;
}
//# sourceMappingURL=index.d.ts.map