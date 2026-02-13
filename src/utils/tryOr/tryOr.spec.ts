import { tryOr, tryOrAsync } from './tryOr';

describe('tryOr', () => {
  it('should return the result of the function if it does not throw', () => {
    expect(tryOr(() => 5)).toBe(5);
  });

  it('should return the default value if the function throws', () => {
    expect(
      tryOr(() => {
        throw new Error('error');
      }, 'default'),
    ).toBe('default');
  });

  it('should return false if the function throws and no default value is provided', () => {
    expect(
      tryOr(() => {
        throw new Error('error');
      }),
    ).toBe(false);
  });
});

describe('tryOrAsync', () => {
  it('should return the result of the async function if it does not throw', async () => {
    const asyncFn = async () => 5;
    await expect(tryOrAsync(asyncFn)).resolves.toBe(5);
  });

  it('should return the default value if the async function throws', async () => {
    const asyncFn = async () => {
      throw new Error('error');
    };
    await expect(tryOrAsync(asyncFn, 'default')).resolves.toBe('default');
  });

  it('should return false if the async function throws and no default value is provided', async () => {
    const asyncFn = async () => {
      throw new Error('error');
    };
    await expect(tryOrAsync(asyncFn)).resolves.toBe(false);
  });
});
