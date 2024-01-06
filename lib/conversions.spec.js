import { bytesInGB, convertBytesToGB, setPrecision } from './conversions';

describe('conversions', () => {
  describe('setPrecision', () => {
    it('should set precision 0', () => {
      const precision0 = setPrecision(0);
      const vals = [1.12345, 1.1234, 1.123, 1.12, 1.1, 1.0, 1];
      expect(vals.map(precision0)).toEqual(Array(vals.length).fill(1));
    });
    it('should set precision 3', () => {
      const precision3 = setPrecision(3);
      const vals = [1.12345, 1.1234, 1.123, 1.12, 1.1, 1.0, 1, -1];
      expect(vals.map(precision3)).toEqual([1.123, 1.123, 1.123, 1.12, 1.1, 1.0, 1, -1]);
    });
  });

  describe('convertBytesToGB', () => {
    it('should convert GB to bytes', () => {
      expect(convertBytesToGB(bytesInGB)).toEqual(1);
      expect(convertBytesToGB(bytesInGB * 2)).toEqual(2);
    });
  });
});
