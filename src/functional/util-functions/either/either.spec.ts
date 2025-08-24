import { either } from '.';
import { Identity } from '../../monads';
import { pipe } from '../pipe';

const is3 = (x): boolean => x === 3;
const isNumber = (x): boolean => typeof x === 'number';
const multiplyBy11 = (x): number => x * 11;
const add2 = (x): number => x + 2;
const not3Error = (x): Error => new Error(`The value is not 3, instead got ${x}`);
const notNumberError = (x): Error => new Error(`The value is not a number, instead got ${x}`);

const EitherPipe = pipe(
  either(is3, multiplyBy11, not3Error),
  either(isNumber, add2, notNumberError),
);

const piped = EitherPipe(3);
const either1 = Identity(3).chain(either(is3, multiplyBy11, not3Error));
const either2 = Identity(3)
  .map(either(is3, multiplyBy11, not3Error))
  .chain(either(isNumber, multiplyBy11, notNumberError));
const either3 = Identity(3)
  .map(either(is3, multiplyBy11, not3Error))
  .map(multiplyBy11)
  .chain(add2);
const eitherFail = Identity(4).chain(either(is3, multiplyBy11, not3Error));
const eitherFail2 = Identity(3)
  .map(either(is3, multiplyBy11, not3Error))
  .map((x) => `I am a String ${x}`)
  .chain(either(isNumber, multiplyBy11, notNumberError));

describe('Either Function', () => {
  it('should return value', () => {
    expect(piped).toEqual(35);
    expect(either1).toEqual(33);
    expect(either2).toEqual(363);
    expect(either3).toEqual(365);
  });

  it('should return an Error Object', () => {
    expect(eitherFail.message).toEqual('The value is not 3, instead got 4');
    expect(eitherFail2.message).toEqual('The value is not a number, instead got I am a String 33');
  });
  describe('checker as boolean', () => {
    it('should return value', () => {
      const truthyValue = 'truthy';
      const falseyValue = null;

      const doTrue = jest.fn((v) => 'didTrue' + v);
      const doFalse = jest.fn((v) => 'didFalse' + v);

      const checkerFn = (v) => v === 'truthy';
      const negitiveCheckerFn = (v) => v !== 'truthy';

      expect(either(true, doTrue, doFalse)(truthyValue)).toEqual('didTrue' + truthyValue);
      expect(either(true, doTrue, doFalse)(falseyValue)).toEqual('didTrue' + falseyValue);

      expect(either({}, doTrue, doFalse)(truthyValue)).toEqual('didTrue' + truthyValue);
      expect(either('string', doTrue, doFalse)(falseyValue)).toEqual('didTrue' + falseyValue);

      expect(either(false, doTrue, doFalse)(truthyValue)).toEqual('didFalse' + truthyValue);
      expect(either(false, doTrue, doFalse)(falseyValue)).toEqual('didFalse' + falseyValue);

      expect(either(null, doTrue, doFalse)(truthyValue)).toEqual('didFalse' + truthyValue);
      expect(either(undefined, doTrue, doFalse)(falseyValue)).toEqual('didFalse' + falseyValue);

      expect(either(checkerFn, doTrue, doFalse)(truthyValue)).toEqual('didTrue' + truthyValue);
      expect(either(checkerFn, doTrue, doFalse)(falseyValue)).toEqual('didFalse' + falseyValue);

      expect(either(negitiveCheckerFn, doTrue, doFalse)(truthyValue)).toEqual(
        'didFalse' + truthyValue,
      );
      expect(either(negitiveCheckerFn, doTrue, doFalse)(falseyValue)).toEqual(
        'didTrue' + falseyValue,
      );
    });
  });
});
