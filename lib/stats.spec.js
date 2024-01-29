import os, { freemem, loadavg } from 'os';
import { freeMemory, getLoadPastMinute, loadAvg, totalMemory } from './stats';
import { KBInGB, MBInGB, bytesInGB } from './conversions';

describe('stats', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadAvg', () => {
    it('should return loadAvg', () => {
      expect(Array.isArray(loadAvg())).toEqual(true);
    });

    it('should return load averages', () => {
      const osSpy = jest.spyOn(os, 'loadavg').mockImplementation(() => [0.009, 0.09, 0.9]);
      expect(loadAvg()).toEqual([0.009, 0.09, 0.9]);
      expect(loadAvg(2)).toEqual([0.01, 0.09, 0.9]);
    });
  });

  describe('getLoadPastMinute', () => {
    it('should get load past minute', () => {
      const osSpy = jest.spyOn(os, 'loadavg').mockImplementation(() => [0.009, 0.099, 0.9]);
      expect(getLoadPastMinute()).toEqual(0.009);
      expect(getLoadPastMinute(2)).toEqual(0.01);
    });
  });

  describe('freeMemory', () => {
    it('should get free memory in bytes', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('bytes')).toEqual(bytesInGB);
      expect(freeMemory()).toEqual(bytesInGB);
    });
    it('should get free memory in kb', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('kb')).toEqual(KBInGB);
    });
    it('should get free memory in mb', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('mb')).toEqual(MBInGB);
    });
    it('should get free memory in gb', () => {
      const osSpy = jest.spyOn(os, 'freemem').mockImplementation(() => bytesInGB);
      expect(freeMemory('gb')).toEqual(1);
    });
  });

  describe('totalMemory', () => {
    it('should get total memory in bytes', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('bytes')).toEqual(bytesInGB);
      expect(totalMemory()).toEqual(bytesInGB);
    });
    it('should get total memory in kb', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('kb')).toEqual(KBInGB);
    });
    it('should get total memory in mb', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('mb')).toEqual(MBInGB);
    });
    it('should get total memory in gb', () => {
      const osSpy = jest.spyOn(os, 'totalmem').mockImplementation(() => bytesInGB);
      expect(totalMemory('gb')).toEqual(1);
    });
  });
});
