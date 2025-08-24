type MergeObjectsFnType = <A extends object, B extends object>(objA: A, objB: B) => A & B;
type MergeObjectsFnTypePartiallyApplied = <A extends object>(objA: A) => <B extends object>(objB: B) => A & B;
export declare const mergeObjects: MergeObjectsFnType & MergeObjectsFnTypePartiallyApplied;
export {};
//# sourceMappingURL=index.d.ts.map