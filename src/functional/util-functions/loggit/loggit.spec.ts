import { loggit } from '.';

describe('loggit', () => {
  it('call the first arg with the second arg and return the second', () => {
    const spy = jest.spyOn(console, 'log');
    const value = 'log value no args';
    const returned = loggit()(value);
    expect(spy).toBeCalledWith(value);
    expect(returned).toBe(value);
  });
  it('call the first arg with the second arg and return the second', () => {
    const spy = jest.spyOn(console, 'log');
    const value = 'log value more than 1 arg';
    const note1 = 'note1';
    const note2 = 'note2';
    const returned = loggit(note1, note2)(value);
    expect(spy).toBeCalledWith(note1, note2, value);
    expect(returned).toBe(value);
  });
});
