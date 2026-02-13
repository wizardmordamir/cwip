describe('removePath', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should call fs.rmSync with correct options (sync)', async () => {
    const rmSyncMock = jest.fn();
    jest.doMock('node:fs', () => ({
      rmSync: rmSyncMock,
    }));
    const { removePathSync } = await import('./removePath');
    removePathSync('/path/to/remove');
    expect(rmSyncMock).toHaveBeenCalledWith(
      '/path/to/remove',
      expect.objectContaining({ force: true, recursive: true }),
    );
  });

  it('should call fs.promises.rm with correct options (async)', async () => {
    const rmMock = jest.fn(() => Promise.resolve());
    jest.doMock('node:fs', () => ({
      promises: {
        rm: rmMock,
      },
    }));
    const { removePath } = await import('./removePath');
    await removePath('/path/to/remove');
    expect(rmMock).toHaveBeenCalledWith(
      '/path/to/remove',
      expect.objectContaining({ force: true, recursive: true }),
    );
  });
});
