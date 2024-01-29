import {
  GBInKB,
  GBInMB,
  KBInGB,
  KBInMB,
  MBInGB,
  MBInKB,
  bytesInGB,
  bytesInKB,
  bytesInMB,
  convertBytesToGB,
  convertBytesToKB,
  convertBytesToMB,
  convertGBToBytes,
  convertKBToBytes,
  convertMBToBytes,
  convertGBToKB,
  convertGBToMB,
  convertKBToGB,
  convertKBToMB,
  convertMBToGB,
  convertMBToKB,
  convertBytesTo,
} from './conversions';

describe('conversions', () => {
  describe('convertBytesTo', () => {
    it('should convert bytes to kb', () => {
      expect(convertBytesTo(1, 'bytes')).toEqual(1);
      expect(convertBytesTo(bytesInGB * 2, 'gb')).toEqual(2);
    });
  });
  describe('convertBytesToKB', () => {
    it('should convert bytes to kb', () => {
      expect(convertBytesToKB(bytesInGB)).toEqual(KBInGB);
      expect(convertBytesToKB(bytesInGB * 2)).toEqual(KBInGB * 2);
    });
  });
  describe('convertBytesToMB', () => {
    it('should convert bytes to MB', () => {
      expect(convertBytesToMB(bytesInGB)).toEqual(MBInGB);
      expect(convertBytesToMB(bytesInGB * 2)).toEqual(MBInGB * 2);
    });
  });
  describe('convertBytesToGB', () => {
    it('should convert bytes to GB', () => {
      expect(convertBytesToGB(bytesInGB)).toEqual(1);
      expect(convertBytesToGB(bytesInGB * 2)).toEqual(2);
    });
  });
  describe('convertKBToBytes', () => {
    it('should convert KB to bytes', () => {
      expect(convertKBToBytes(1)).toEqual(bytesInKB);
      expect(convertKBToBytes(2)).toEqual(bytesInKB * 2);
    });
  });
  describe('convertMBToBytes', () => {
    it('should convert MB to bytes', () => {
      expect(convertMBToBytes(1)).toEqual(bytesInMB);
      expect(convertMBToBytes(2)).toEqual(bytesInMB * 2);
    });
  });
  describe('convertGBToBytes', () => {
    it('should convert GB to bytes', () => {
      expect(convertGBToBytes(1)).toEqual(bytesInGB);
      expect(convertGBToBytes(2)).toEqual(bytesInGB * 2);
    });
  });
  describe('convertKBToMB', () => {
    it('should convert KB to MB', () => {
      expect(convertKBToMB(1)).toEqual(MBInKB);
      expect(convertKBToMB(2)).toEqual(MBInKB * 2);
    });
  });
  describe('convertKBToGB', () => {
    it('should convert KB to GB', () => {
      expect(convertKBToGB(1)).toEqual(GBInKB);
      expect(convertKBToGB(2)).toEqual(GBInKB * 2);
    });
  });
  describe('convertMBToKB', () => {
    it('should convert MB to KB', () => {
      expect(convertMBToKB(1)).toEqual(KBInMB);
      expect(convertMBToKB(2)).toEqual(KBInMB * 2);
    });
  });
  describe('convertMBToGB', () => {
    it('should convert MB to GB', () => {
      expect(convertMBToGB(1)).toEqual(GBInMB);
      expect(convertMBToGB(2)).toEqual(GBInMB * 2);
    });
  });
  describe('convertGBToKB', () => {
    it('should convert GB to KB', () => {
      expect(convertGBToKB(1)).toEqual(KBInGB);
      expect(convertGBToKB(2)).toEqual(KBInGB * 2);
    });
  });
  describe('convertGBToMB', () => {
    it('should convert GB to MB', () => {
      expect(convertGBToMB(1)).toEqual(MBInGB);
      expect(convertGBToMB(2)).toEqual(MBInGB * 2);
    });
  });
});
