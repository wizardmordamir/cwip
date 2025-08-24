import { includes } from '.';

describe('includes', () => {
  it('should call includes on array with passed in fn', () => {
    const array = ['duck', 'duck', 'goose'];
    expect(includes('goose', array)).toEqual(true);
    expect(includes('duck', array)).toEqual(true);
    expect(includes('swan', array)).toEqual(false);
  });
  it('should be curry-able', () => {
    const object1 = {};
    const object2 = {};
    const object3 = {};
    const array = [object1, object1, object2];
    expect(includes(object1, array)).toEqual(true);
    expect(includes(object2, array)).toEqual(true);
    expect(includes(object3, array)).toEqual(false);
  });
});
