import { Identity } from '.';

describe('Identity', () => {
  describe('join', () => {
    it('should return the value', () => {
      expect(Identity(undefined).join()).toBeUndefined();
      expect(Identity(null).join()).toBeNull();
      expect(Identity({}).join()).toEqual({});
      expect(Identity([]).join()).toEqual([]);
      expect(Identity(0).join()).toEqual(0);
      expect(Identity('test').join()).toEqual('test');
    });
  });

  describe('map', () => {
    it('should apply function(s) to value', () => {
      expect(
        Identity(0)
          .map((x) => x + 1)
          .join(),
      ).toEqual(1);
      expect(
        Identity(0)
          .map((x) => x + 1)
          .map((x) => x + 1)
          .join(),
      ).toEqual(2);
    });
  });

  describe('chain', () => {
    it('should apply function(s) and return the value', () => {
      expect(Identity(0).chain((x) => x + 1)).toEqual(1);
      expect(
        Identity(0)
          .map((x) => x + 1)
          .chain((x) => x + 1),
      ).toEqual(2);
    });
  });
});
