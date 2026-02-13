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
    const { isDirOrSymLinkSync } = await import('.');
    expect(isDirOrSymLinkSync('/path/to/directory')).toBe(true);
  });

  it('should return false for a non-directory (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => ({ isDirectory: () => false })),
    }));
    const { isDirOrSymLinkSync } = await import('.');
    expect(isDirOrSymLinkSync('/path/to/file')).toBe(false);
  });

  it('should return false if an error occurs (sync)', async () => {
    jest.doMock('node:fs', () => ({
      statSync: jest.fn(() => {
        throw new Error('Error');
      }),
    }));
    const { isDirOrSymLinkSync } = await import('.');
    expect(isDirOrSymLinkSync('/path/to/nonexistent')).toBe(false);
  });

  it('should return true for a directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.resolve({ isDirectory: () => true })),
      },
    }));
    const { isDirOrSymLink } = await import('.');
    await expect(isDirOrSymLink('/path/to/directory')).resolves.toBe(true);
  });

  it('should return false for a non-directory (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.resolve({ isDirectory: () => false })),
      },
    }));
    const { isDirOrSymLink } = await import('.');
    await expect(isDirOrSymLink('/path/to/file')).resolves.toBe(false);
  });

  it('should return false if an error occurs (async)', async () => {
    jest.doMock('node:fs', () => ({
      promises: {
        stat: jest.fn(() => Promise.reject(new Error('Error'))),
      },
    }));
    const { isDirOrSymLink } = await import('.');
    await expect(isDirOrSymLink('/path/to/nonexistent')).resolves.toBe(false);
  });
});
