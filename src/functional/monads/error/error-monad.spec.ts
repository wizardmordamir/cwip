import { ErrorMonad } from '.';
import { pipe } from '../../util-functions/pipe';

const is3 = (x): boolean => x === 3;
const isNumber = (x): boolean => typeof x === 'number';
const multiplyBy11 = (x): number => x * 11;
const add2 = (x): number => x + 2;
const not3Error = 'The value is not 3';
const notNumberError = 'The value is not a number';
const chainAdd2 = (x): number => x.chain(add2);

const EitherPipe = pipe(ErrorMonad(is3, multiplyBy11, not3Error), chainAdd2);

const Piped = EitherPipe(3);

const Either1 = ErrorMonad(is3, multiplyBy11, not3Error, 3).join();

const Either2 = ErrorMonad(is3, multiplyBy11, not3Error, 3)
  .chain(ErrorMonad(isNumber, multiplyBy11, notNumberError))
  .join();

const Either3 = ErrorMonad(is3, multiplyBy11, not3Error, 3).map(multiplyBy11).chain(add2);

const EitherFail = ErrorMonad(is3, multiplyBy11, not3Error, 4).join();

const EitherFail2 = ErrorMonad(is3, multiplyBy11, not3Error, 3)
  .map((x) => `I am a String ${x}`)
  .chain(ErrorMonad(isNumber, multiplyBy11, notNumberError))
  .join();

describe('Either Monad', () => {
  it('should return value', () => {
    expect(Piped).toEqual(35);
    expect(Either1).toEqual(33);
    expect(Either2).toEqual(363);
    expect(Either3).toEqual(365);
  });

  it('should return an Error Object', () => {
    expect(EitherFail.message).toEqual('The value is not 3');
    expect(EitherFail2.message).toEqual('The value is not a number');
  });
});
