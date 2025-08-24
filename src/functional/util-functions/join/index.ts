import { MonadInterface } from '../../interfaces/Monad';

export const join = (x: MonadInterface<any>) => {
  return x.join();
};

export default join;
