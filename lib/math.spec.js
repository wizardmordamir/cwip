import {
  add,
  convertScientificToDecimal,
  divide,
  doMath,
  multiply,
  round,
  roundDown,
  roundUp,
  setPrecision,
  subtract,
} from './math';

describe('math', () => {
  describe('setPrecision', () => {
    it('should set precision 0', () => {
      const precision0 = setPrecision(0);
      const vals = [1.12345, 1.1234, 1.123, 1.12, 1.1, 1.0, 1];
      expect(vals.map(precision0)).toEqual(Array(vals.length).fill(1));
    });
    it('should set precision 2', () => {
      expect(setPrecision(2, 0.009)).toEqual(0.01);
    });
    it('should set precision 3', () => {
      const precision3 = setPrecision(3);
      const vals = [1.12345, 1.1234, 1.123, 1.12, 1.1, 1.0, 1, -1];
      expect(vals.map(precision3)).toEqual([1.123, 1.123, 1.123, 1.12, 1.1, 1.0, 1, -1]);
    });
  });

  describe('round', () => {
    it('should round up', () => {
      const vals = [1.9999999999999, 1.50000001];
      expect(vals.map(round(0))).toEqual(Array(vals.length).fill(2));
    });
    it('should round up negative', () => {
      const vals = [-1.1, -1.4999999999];
      expect(vals.map(round(0))).toEqual(Array(vals.length).fill(-1));
    });
    it('should round down', () => {
      const vals = [1.1, 1.4999999999];
      expect(vals.map(round(0))).toEqual(Array(vals.length).fill(1));
    });
    it('should round down negative', () => {
      const vals = [-1.99999999999, -1.500000000001];
      expect(vals.map(round(0))).toEqual(Array(vals.length).fill(-2));
    });
  });

  describe('roundUp', () => {
    it('should round up', () => {
      const vals = [1.9999999999999, 1.50000001, 1.1, 1.4999999999];
      expect(vals.map(roundUp(0))).toEqual(Array(vals.length).fill(2));
    });
    it('should round up negative', () => {
      const vals = [-1.1, -1.4999999999, -1.99999999999, -1.500000000001];
      expect(vals.map(roundUp(0))).toEqual(Array(vals.length).fill(-1));
    });
  });

  describe('roundDown', () => {
    it('should round down', () => {
      const vals = [1.1, 1.4999999999, 1.9999999999999, 1.50000001];
      expect(vals.map(roundDown(0))).toEqual(Array(vals.length).fill(1));
    });
    it('should round down negative', () => {
      const vals = [-1.99999999999, -1.500000000001, -1.1, -1.4999999999];
      expect(vals.map(roundDown(0))).toEqual(Array(vals.length).fill(-2));
    });
  });

  describe('doMath', () => {
    it('should return undefined for unknown operation', () => {
      expect(doMath('divi', 1, 2)).toEqual(undefined);
    });
  });

  describe('add', () => {
    it('should add', () => {
      const vals = [
        [1, 1, 2],
        [-1, -1, -2],
        [1.11111111111, 1.11111111111, 2.22222222222],
        [2.3, 2.4, 4.7],
        [100000000000000000000, 100000000000000000000, 200000000000000000000],
        [1e20, 1e20, 2e20],
        [1e20, 1e20, 2e20],
      ];
      vals.forEach((nums) => {
        expect([nums[0], nums[1], add(nums[0], nums[1])]).toEqual([nums[0], nums[1], nums[2]]);
      });
    });
  });

  describe('subtract', () => {
    it('should subtract', () => {
      const vals = [
        [1, 1, 0],
        [-1, -1, 0],
        [2.22222222222, 1.11111111111, 1.11111111111],
        [1.11111111111, 2.22222222222, -1.11111111111],
        [2.3, 2.4, -0.1],
        [1e1, 1e1, 0],
        [10e-1, 10e-1, 0],
        [0.0000000000000000000000000000001, 0.0000000000000000000000000000001, 0],
      ];
      vals.forEach((nums) => {
        expect([nums[0], nums[1], subtract(nums[0], nums[1])]).toEqual([nums[0], nums[1], nums[2]]);
      });
    });
  });

  describe('multiply', () => {
    it('should multiply', () => {
      const vals = [
        [1, 1, 1],
        [-1, -1, 1],
        [-1, 1, -1],
        [1.1, 1, 1.1],
        [1, 1.11, 1.11],
        [1.11, 1.11, 1.2321],
        [1.111, 1.111, 1.234321],
        [2.3, 2.4, 5.52],
        [1.1111111, 1.1111111, 1.23456787654321],
        [1.11111111, 1.11111111, 1.234567898765432],
        [1.111111111, 1.111111111, 1.2345679009876545],
        [1.1111111111, 1.1111111111, 1.2345679012098765],
        [1e1, 1e1, 100],
        [10e-1, 10e-1, 1],
        [0.0000000000000000000000000000001, 0.0000000000000000000000000000001, 0], // TODO
      ];
      vals.forEach((nums) => {
        expect([nums[0], nums[1], multiply(nums[0], nums[1])]).toEqual([nums[0], nums[1], nums[2]]);
      });
    });
  });

  describe('divide', () => {
    it('should divide', () => {
      const vals = [
        [1, 1, 1],
        [-1, -1, 1],
        [1.11, 1.11, 1],
        [2.3, 2.4, 0.9583333333333334],
      ];
      vals.forEach((nums) => {
        expect([nums[0], nums[1], divide(nums[0], nums[1])]).toEqual([nums[0], nums[1], nums[2]]);
      });
    });
  });

  describe('convertScientificToDecimal', () => {
    it('should convert scientific to decimal', () => {
      const vals = [
        [1.7e10, 17000000000],
        [1.7e10, 17000000000],
        [1.7e-10, '.00000000017'],
        [17e10, 170000000000],
        [17e-10, '.0000000017'],
        [1e30, '1000000000000000000000000000000'],
        [1000000000000000000, 1000000000000000000],
        [1.7e30, '1700000000000000000000000000000'],
        [1.7e-30, '.0000000000000000000000000000017'],
        [107.5e-1, 10.75],
        [1.075e1, 10.75],
        [1.075e1, 10.75],
      ];
      vals.forEach((nums) => {
        expect([nums[0], convertScientificToDecimal(nums[0])]).toEqual([nums[0], nums[1]]);
      });
    });
  });
});
