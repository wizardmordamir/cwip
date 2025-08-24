import { deepFreeze } from '.';

describe('deepFreeze', () => {
  it('should freeze deeply', () => {
    const obj: any = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: [
            'a',
            {
              f: 'b',
            },
          ],
        },
      },
    };
    const frozenObj = deepFreeze(obj);
    expect(Object.isFrozen(frozenObj)).toBe(true);
    expect(Object.isFrozen(frozenObj.b)).toBe(true);
    expect(Object.isFrozen(frozenObj.b.d)).toBe(true);
    expect(Object.isFrozen(frozenObj.b.d.e)).toBe(true);
    expect(Object.isFrozen(frozenObj.b.d.e[1])).toBe(true);
    expect(() => {
      frozenObj.b.d.e[1].a = 'c';
    }).toThrow(TypeError);
    expect(() => {
      frozenObj.b.d.e[1].f = 'c';
    }).toThrow(TypeError);
    expect(() => {
      frozenObj.b.d.e.push('c');
    }).toThrow(TypeError);
  });
});
