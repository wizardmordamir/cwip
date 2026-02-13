describe('isDirectory', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should return true for a directory (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => ({ isDirectory: () => true })),
    }));
    const { isDirSync } = await import('.');
    expect(isDirSync('/path/to/directory')).toBe(true);
  });

  it('should return false for a non-directory (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => ({ isDirectory: () => false })),
    }));
    const { isDirSync } = await import('.');
    expect(isDirSync('/path/to/file')).toBe(false);
  });

  it('should return false if an error occurs (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => {
        throw new Error('Error');
      }),
    }));
    const { isDirSync } = await import('.');
    expect(isDirSync('/path/to/nonexistent')).toBe(false);
  });

  it('should return true for a directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.resolve({ isDirectory: () => true })),
      },
    }));
    const { isDir } = await import('.');
    await expect(isDir('/path/to/directory')).resolves.toBe(true);
  });

  it('should return false for a non-directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.resolve({ isDirectory: () => false })),
      },
    }));
    const { isDir } = await import('.');
    await expect(isDir('/path/to/file')).resolves.toBe(false);
  });

  it('should return false if an error occurs (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.reject(new Error('Error'))),
      },
    }));
    const { isDir } = await import('.');
    await expect(isDir('/path/to/nonexistent')).resolves.toBe(false);
  });
});
