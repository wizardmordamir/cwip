import { ShortCircuit } from '.';

const sc1 = ShortCircuit(3)
  .map((x) => x + 1)
  .join();
const sc2 = ShortCircuit(3).chain((x) => x + 1);

describe('Short Circuit', () => {
  it('should not run function provided to map or chain', () => {
    expect(sc1).toEqual(3);
    expect(sc2).toEqual(3);
  });
});
