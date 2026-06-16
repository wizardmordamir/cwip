# byteConversions

functions for converting between bytes, kb, mb, gb, and tb.

---

## How to Use it

```typescript
  convertBytesTo(1, 'bytes'); // 1
  convertBytesToKB(bytesInGB); // 1_048_576
  convertBytesTo(bytesInGB * 2, 'gb'); // 2
  convertKBToBytes(1); // 1_024
  convertMBToBytes(2); // 2_048
  convertKBToGB(1); // 9.5367431640625e-7
```

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
        expect(
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
