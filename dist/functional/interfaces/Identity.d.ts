import { MonadInterface } from './Monad';
export interface IdentityInterface<T> extends MonadInterface<T> {
    map: (f: Function) => IdentityInterface<T>;
    join: () => T;
    chain: (f: Function) => T;
}
//# sourceMappingURL=Identity.d.ts.map