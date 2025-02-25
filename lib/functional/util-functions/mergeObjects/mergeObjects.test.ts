import { mergeObjects } from '.';

const pb = { peanutButter: true };

const chocolate = { chocolate: true };

const jelly = { peanutButter: false, flavor: 'strawberry' };

const peanutButterAndChocolate = { peanutButter: true, chocolate: true };

const peanutButterAndJelly = { peanutButter: false, flavor: 'strawberry' };

describe('mergeObjects', () => {
  it('should be curryied', () => {
    expect(mergeObjects(pb)(chocolate)).toEqual(peanutButterAndChocolate);
  });

  it('should overwrite any shared properties with the value from the second object', () => {
    expect(mergeObjects(pb)(jelly)).toEqual(peanutButterAndJelly);
  });
});
