# Either Function

A Function that allows code to follow multiple paths based on the result of the evaluation provided

---

## The Code

```typescript
type EvaluatorType = Function | any;

export const either = curry((evaluator: EvaluatorType, success: Function, fail: Function) => (...args: any) => {
  const evaluated = typeof evaluator === 'function'
    ? evaluator(...args)
    : evaluator
  return Boolean(evaluated) ? success(...args) : fail(...args);
});
```

---

## How to Use It with an evaluator function

```typescript
import { either } from '.';

const evaluation = (x, y) => typeof x === 'number' && typeof y === 'number';
const add = (x, y) => x + y;
const pathB = (x, y) => `At least one value provided was not a number: ${x} or ${y}`;

const myEither = either(evaluation, add, pathB);

const resultA = myEither(3, 3);
const resultB = myEither('3', 3);
console.log(resultA); // 6
console.log(resultB); // At least one value provided was not a number: '3' or 3
```

## How to Use It with an evaluator value
```typescript
import { either } from '.';

const normal = (arg1, arg2) => [arg1, arg2].join(' ') + '!';
const yoda = (arg1, arg2) => [arg2, arg1].join(', ') + '... < -_- >';

let YODA_TOGGLE;
either(YODA_TOGGLE, yoda, normal)('this is','cool'); // this is cool!

YODA_TOGGLE = true
either(YODA_TOGGLE, yoda, normal)('this is','cool'); // cool, this is... < -_- >
```
