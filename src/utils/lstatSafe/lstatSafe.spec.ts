describe('lstatSafe', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should return stats for a valid path (sync)', async () => {
    const mockStats = { isFile: () => true } as unknown as import('node:fs').Stats;
    jest.doMock('node:fs', () => ({
      lstatSync: jest.fn(() => mockStats),
    }));
    const { lstatSafeSync } = await import('./lstatSafe');
    expect(lstatSafeSync('/path/to/file')).toBe(mockStats);
  });

  it('should return null for an invalid path (sync)', async () => {
    jest.doMock('node:fs', () => ({
      lstatSync: jest.fn(() => {
        throw new Error('Error');
      }),
    }));
    const { lstatSafeSync } = await import('./lstatSafe');
    expect(lstatSafeSync('/path/to/nonexistent')).toBeNull();
  });

  it('should return stats for a valid path (async)', async () => {
    const mockStats = { isFile: () => true } as unknown as import('node:fs').Stats;
    jest.doMock('node:fs', () => ({
      promises: {
        lstat: jest.fn(() => Promise.resolve(mockStats)),
      },
    }));
    const { lstatSafe } = await import('./lstatSafe');
    await expect(lstatSafe('/path/to/file')).resolves.toBe(mockStats);
  });

  it('should return null for an invalid path (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        lstat: jest.fn(() => Promise.reject(new Error('Error'))),
      },
    }));
    const { lstatSafe } = await import('./lstatSafe');
    await expect(lstatSafe('/path/to/nonexistent')).resolves.toBeNull();
  });
});
