import { MonadInterface } from '../../interfaces/Monad';

export const chain = (fn: Function) => (x: MonadInterface<any>) => x.chain(fn);

export default chain;
