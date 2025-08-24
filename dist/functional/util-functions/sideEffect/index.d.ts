type AnyFn = (..._: any) => any;
type SideEffect = (_: AnyFn) => <T>(v: T) => T;
export declare const sideEffect: SideEffect;
type AnyFnAsync = (..._args: any) => Promise<any>;
type AsyncSideEffect = (fn: AnyFnAsync) => <T>(v: T) => Promise<T>;
export declare const asyncSideEffect: AsyncSideEffect;
export {};
//# sourceMappingURL=index.d.ts.map