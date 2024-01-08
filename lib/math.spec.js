import { add, divide, multiply, round, roundDown, roundUp, subtract } from './math';

describe('math', () => {
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

  describe('add', () => {
    it('should add', () => {
      const vals = [
        [1, 1, 2],
        [-1, -1, -2],
        [1.11111111111, 1.11111111111, 2.22222222222],
        [2.3, 2.4, 4.7],
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
        [1.1, 1, 1.1],
        [1, 1.11, 1.11],
        [1.11, 1.11, 1.2321],
        [1.111, 1.111, 1.234321],
        [2.3, 2.4, 5.52],
        [1.1111111, 1.1111111, 1.23456787654321],
        [1.11111111, 1.11111111, 1.234567898765432],
        [1.111111111, 1.111111111, 1.2345679009876545],
        [1.1111111111, 1.1111111111, 1.2345679012098765],
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
});
