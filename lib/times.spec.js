import { now, toISOString} from './times';

describe('times', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const isoString = '2024-01-01T01:01:01.001Z';

  describe('toISOString', () => {
    it('should get iso string for date', () => {
      const date = new Date(isoString);
      expect(toISOString(date)).toEqual(isoString)
    });
  });

  describe('now', () => {
    it('should get now', async () => {
      const nowDate = new Date(now());
      const pastDate = new Date(new Date().getTime() - 5);
      await new Promise((resolve) => setTimeout(resolve, 1));
      const futureDate = new Date();
      expect([nowDate, pastDate, nowDate < pastDate]).toEqual([nowDate, pastDate, false]);
      expect([nowDate, futureDate, nowDate < futureDate]).toEqual([nowDate, futureDate, true]);
    });
  });
});
