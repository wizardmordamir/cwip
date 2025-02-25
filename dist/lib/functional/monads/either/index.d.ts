import { IdentityInterface, MonadInterface } from '../../interfaces';
export declare class EitherLeft implements IdentityInterface<any> {
    private readonly value;
    constructor(value: any);
    static of(x: any): IdentityInterface<any>;
    map(fn: Function): IdentityInterface<any>;
    join(): any;
    chain(fn: Function): any;
}
export declare class EitherRight implements IdentityInterface<any> {
    private readonly value;
    constructor(value: any);
    static of(x: any): IdentityInterface<any>;
    map(fn: Function): IdentityInterface<any>;
    join(): any;
    chain(fn: Function): any;
}
export declare const Either: import("../../typescriptUtils").Curry<[left: any, right: any, x: EitherLeft | EitherRight], MonadInterface<any>>;
declare const _default: {
    Either: import("../../typescriptUtils").Curry<[left: any, right: any, x: EitherLeft | EitherRight], MonadInterface<any>>;
    EitherLeft: typeof EitherLeft;
    EitherRight: typeof EitherRight;
};
export default _default;
//# sourceMappingURL=index.d.ts.map