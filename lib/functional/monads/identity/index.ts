import { IdentityInterface } from '../../interfaces';

export const Identity = (x): IdentityInterface<any> => ({
  map: (fn): IdentityInterface<any> => Identity(fn(x)),
  join: (): string => x,
  chain: (fn): string => Identity(x).map(fn).join(),
});

export default Identity;
