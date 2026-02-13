describe('isSymbolicLink', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should return true for a directory (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => ({ isSymbolicLink: () => true })),
    }));
    const { isSymLinkSync } = await import('./isSymLink');
    expect(isSymLinkSync('/path/to/directory')).toBe(true);
  });

  it('should return false for a non-directory (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => ({ isSymbolicLink: () => false })),
    }));
    const { isSymLinkSync } = await import('./isSymLink');
    expect(isSymLinkSync('/path/to/file')).toBe(false);
  });

  it('should return false if an error occurs (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => {
        throw new Error('Error');
      }),
    }));
    const { isSymLinkSync } = await import('./isSymLink');
    expect(isSymLinkSync('/path/to/nonexistent')).toBe(false);
  });

  it('should return true for a directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.resolve({ isSymbolicLink: () => true })),
      },
    }));
    const { isSymLink } = await import('./isSymLink');
    await expect(isSymLink('/path/to/directory')).resolves.toBe(true);
  });

  it('should return false for a non-directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.resolve({ isSymbolicLink: () => false })),
      },
    }));
    const { isSymLink } = await import('./isSymLink');
    await expect(isSymLink('/path/to/file')).resolves.toBe(false);
  });

  it('should return false if an error occurs (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.reject(new Error('Error'))),
      },
    }));
    const { isSymLink } = await import('./isSymLink');
    await expect(isSymLink('/path/to/nonexistent')).resolves.toBe(false);
  });
});
