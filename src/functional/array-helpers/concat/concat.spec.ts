import { concat } from '.';

describe('concat', () => {
  it('should concat arrays', () => {
    const parent = ['duck', 'duck', 'goose'];
    const child = [1, 2, 3];
    expect(concat(child)(parent)).toEqual([...parent, ...child]);
  });
  it('should concat arrays and values', () => {
    const parent = ['duck', 'duck', 'goose'];
    const child = 1;
    expect(concat(child)(parent)).toEqual([...parent, child]);
  });
});
