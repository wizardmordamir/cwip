import { find } from '.';

describe('find', () => {
  it('should call find on array with passed in fn', () => {
    const array = ['duck', 'duck', 'goose'];
    const findFn = (v) => v === 'goose';
    const finded = find(findFn, array);
    expect(finded).toEqual('goose');
  });
  it('should be curry-able', () => {
    const array = ['duck', 'duck', 'goose'];
    const findFn = (v) => v === 'goose';
    const finded = find(findFn)(array);
    expect(finded).toEqual('goose');
  });
});
