import { IdentityInterface } from '../../interfaces';

export const ShortCircuit = (x): IdentityInterface<any> => ({
  map: (): IdentityInterface<any> => ShortCircuit(x),
  join: (): string => x,
  chain: (): string => ShortCircuit(x).join(),
});

export default ShortCircuit;
