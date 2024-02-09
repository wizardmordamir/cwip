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
  convertTBToGB,
  convertTBToBytes,
  convertBytesToTB,
  convertTBToMB,
  MBInTB,
  convertTBToKB,
  TBInKB,
  GBInTB,
  bytesInTB,
  KBInTB,
  convertKBToTB,
  convertMBToTB,
  TBInMB,
  convertGBToTB,
  TBInGB,
} from './conversions';

describe('conversions', () => {
  describe('converting bytes to...', () => {
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
    describe('convertBytesToTB', () => {
      it('should convert bytes to TB', () => {
        expect(convertBytesToTB(bytesInTB)).toEqual(1);
        expect(convertBytesToTB(bytesInTB * 2)).toEqual(2);
      });
    });
  });

  describe('convert to bytes', () => {
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
    describe('convertTBToBytes', () => {
      it('should convert TB to bytes', () => {
        expect(convertTBToBytes(1)).toEqual(bytesInTB);
        expect(convertTBToBytes(2)).toEqual(bytesInTB * 2);
      });
    });
  });

  describe('convert to kb', () => {
    describe('convertMBToKB', () => {
      it('should convert MB to KB', () => {
        expect(convertMBToKB(1)).toEqual(KBInMB);
        expect(convertMBToKB(2)).toEqual(KBInMB * 2);
      });
    });
    describe('convertGBToKB', () => {
      it('should convert GB to KB', () => {
        expect(convertGBToKB(1)).toEqual(KBInGB);
        expect(convertGBToKB(2)).toEqual(KBInGB * 2);
      });
    });
    describe('convertTBToKB', () => {
      it('should convert TB to KB', () => {
        expect(convertTBToKB(1)).toEqual(KBInTB);
        expect(convertTBToKB(2)).toEqual(KBInTB * 2);
      });
    });
  });

  describe('convert to mb', () => {
    describe('convertKBToMB', () => {
      it('should convert KB to MB', () => {
        expect(convertKBToMB(1)).toEqual(MBInKB);
        expect(convertKBToMB(2)).toEqual(MBInKB * 2);
      });
    });
    describe('convertGBToMB', () => {
      it('should convert GB to MB', () => {
        expect(convertGBToMB(1)).toEqual(MBInGB);
        expect(convertGBToMB(2)).toEqual(MBInGB * 2);
      });
    });
    describe('convertTBToMB', () => {
      it('should convert TB to MB', () => {
        expect(convertTBToMB(1)).toEqual(MBInTB);
        expect(convertTBToMB(2)).toEqual(MBInTB * 2);
      });
    });
  });

  describe('convert to gb', () => {
    describe('convertKBToGB', () => {
      it('should convert KB to GB', () => {
        expect(convertKBToGB(1)).toEqual(GBInKB);
        expect(convertKBToGB(2)).toEqual(GBInKB * 2);
      });
    });
    describe('convertMBToGB', () => {
      it('should convert MB to GB', () => {
        expect(convertMBToGB(1)).toEqual(GBInMB);
        expect(convertMBToGB(2)).toEqual(GBInMB * 2);
      });
    });
    describe('convertTBToGB', () => {
      it('should convert TB to GB', () => {
        expect(convertTBToGB(1)).toEqual(GBInTB);
        expect(convertTBToGB(2)).toEqual(GBInTB * 2);
      });
    });
  });

  describe('convert to tb', () => {
    describe('convertKBToTB', () => {
      it('should convert KB to TB', () => {
        expect(convertKBToTB(1)).toEqual(TBInKB);
        expect(convertKBToTB(2)).toEqual(TBInKB * 2);
      });
    });
    describe('convertMBToTB', () => {
      it('should convert MB to TB', () => {
        expect(convertMBToTB(1)).toEqual(TBInMB);
        expect(convertMBToTB(2)).toEqual(TBInMB * 2);
      });
    });
    describe('convertGBToTB', () => {
      it('should convert GB to TB', () => {
        expect(convertGBToTB(1)).toEqual(TBInGB);
        expect(convertGBToTB(2)).toEqual(TBInGB * 2);
      });
    });
  });
});
