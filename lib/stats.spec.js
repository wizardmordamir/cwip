import { freeMemory, getLoadPastMinute, loadAvg, totalMemory } from './stats';
import { KBInGB, MBInGB, bytesInGB } from './byteConversions';

jest.mock('os', () => ({
  freemem: jest.fn(() => 1_073_741_824),
  loadavg: jest.fn(() => [0.009, 0.09, 0.9]),
  totalmem: jest.fn(() => 1_073_741_824),
}));

describe('stats', () => {
  let os;

  const mockLoadAvg = [0.009, 0.09, 0.9];

  beforeEach(async () => {
    os = await import('os');
    jest.clearAllMocks();
  });

  describe('loadAvg', () => {
    it('should return loadAvg', () => {
      expect(Array.isArray(loadAvg())).toEqual(true);
    });

    it('should return load averages', () => {
      const osSpy = jest.spyOn(os, 'loadavg').mockImplementation(() => mockLoadAvg);
      expect(loadAvg()).toEqual([0.009, 0.09, 0.9]);
      expect(loadAvg(2)).toEqual([0.01, 0.09, 0.9]);
      expect(osSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLoadPastMinute', () => {
    it('should get load past minute', () => {
      const osSpy = jest.spyOn(os, 'loadavg').mockImplementation(() => [0.009, 0.099, 0.9]);
      expect(getLoadPastMinute()).toEqual(0.009);
      expect(getLoadPastMinute(2)).toEqual(0.01);
      expect(osSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('freeMemory', () => {
    it('should get free memory in bytes', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('bytes')).toEqual(bytesInGB);
      expect(freeMemory()).toEqual(bytesInGB);
      expect(osSpy).toHaveBeenCalledTimes(2);
    });
    it('should get free memory in kb', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('kb')).toEqual(KBInGB);
      expect(osSpy).toHaveBeenCalledTimes(1);
    });
    it('should get free memory in mb', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('mb')).toEqual(MBInGB);
      expect(osSpy).toHaveBeenCalledTimes(1);
    });
    it('should get free memory in gb', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('gb')).toEqual(1);
      expect(osSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('totalMemory', () => {
    it('should get total memory in bytes', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('bytes')).toEqual(bytesInGB);
      expect(totalMemory()).toEqual(bytesInGB);
      expect(osSpy).toHaveBeenCalledTimes(2);
    });
    it('should get total memory in kb', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('kb')).toEqual(KBInGB);
      expect(osSpy).toHaveBeenCalledTimes(1);
    });
    it('should get total memory in mb', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('mb')).toEqual(MBInGB);
      expect(osSpy).toHaveBeenCalledTimes(1);
    });
    it('should get total memory in gb', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('gb')).toEqual(1);
      expect(osSpy).toHaveBeenCalledTimes(1);
    });
  });
});
