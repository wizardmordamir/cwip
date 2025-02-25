import { Either, EitherLeft, EitherRight } from '.';
import { Identity } from '../identity';
import { ShortCircuit } from '../short-circuit';

const evaluation = (x) => {
  return typeof x === 'number' ? EitherLeft.of(x) : EitherRight.of(x);
};

const shortedEval = (x) => {
  return x;
};

const StringToIntConverter = (x) => {
  return parseInt(x) ? Identity(parseInt(x)) : ShortCircuit(x);
};

const add1 = (x) => x + 1;
const add2 = (x) => x + 2;

const result1 = Either(Identity, ShortCircuit, evaluation(3)).map(add1).chain(add2);

const result2 = Either(Identity, StringToIntConverter, evaluation('3')).map(add1).chain(add2);

const result3 = EitherLeft.of(3).map(add1).chain(add2);

const result4 = EitherRight.of(3).map(add1).chain(add2);

const fail1 = Either(Identity, ShortCircuit, evaluation('nope')).map(add1).chain(add2);

const fail2 = Either(Identity, StringToIntConverter, evaluation('apple')).map(add1).chain(add2);

const fail3 = Either(Identity, StringToIntConverter, shortedEval('apple')).map(add1).chain(add2);

describe('Either', () => {
  it('should apply Either, Left, Right, and Evaluation Fucntions Properly', () => {
    expect(result1).toEqual(6);
    expect(result2).toEqual(6);
    expect(result3).toEqual(6);
    expect(result4).toEqual(6);
  });

  it('should fail properly, by not applying additional functions', () => {
    expect(fail1).toEqual('nope');
    expect(fail2).toEqual('apple');
    expect(fail3).toEqual('apple');
  });
});
