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
      existsSync: jest.fn(() => true),
    }));
    const { isExistingPathSync } = await import('./isExistingPath');
    expect(isExistingPathSync('/path/to/directory')).toBe(true);
  });

  it('should return false for a non-directory (sync)', async () => {
    jest.doMock('node:fs', () => ({
      existsSync: jest.fn(() => false),
    }));
    const { isExistingPathSync } = await import('./isExistingPath');
    expect(isExistingPathSync('/path/to/file')).toBe(false);
  });

  it('should return false if an error occurs (sync)', async () => {
    jest.doMock('node:fs', () => ({
      existsSync: jest.fn(() => {
        throw new Error('Error');
      }),
    }));
    const { isExistingPathSync } = await import('./isExistingPath');
    expect(isExistingPathSync('/path/to/nonexistent')).toBe(false);
  });

  it('should return true for a directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        access: jest.fn(() => Promise.resolve(true)),
      },
    }));
    const { isExistingPath } = await import('./isExistingPath');
    await expect(isExistingPath('/path/to/directory')).resolves.toBe(true);
  });

  it('should return false for a non-directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        access: jest.fn(() => Promise.reject(new Error('ENOENT'))),
      },
    }));
    const { isExistingPath } = await import('./isExistingPath');
    await expect(isExistingPath('/path/to/file')).resolves.toBe(false);
  });

  it('should return false if an error occurs (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        access: jest.fn(() => Promise.reject(new Error('Error'))),
      },
    }));
    const { isExistingPath } = await import('./isExistingPath');
    await expect(isExistingPath('/path/to/nonexistent')).resolves.toBe(false);
  });
});
