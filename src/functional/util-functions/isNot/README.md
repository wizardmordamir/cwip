# isNot Function

A function that receives an evaluator to negate either values or function calls within a functional integration.

---

## The Code

```typescript
type EvaluatorType = Function | any;

export const isNot = curry((evaluator: Function | any, value: any) => {
  return typeof evaluator === 'function'
    ? !evaluator(value)
    : !Boolean(evaluator);
});
```

---

## How to Use It with an evaluator function

```typescript
import { ifIt, isNot, isObject } from '@asset-core/functional-js-utils';

const makeObject = () => ({ id: 'default-id'});
const initObject = ifIt(isNot(isObject), makeObject);

initObject({}); // {}
initObject(null); // { id: 'default-id'}
initObject({some: 'thing'}) // {some: 'thing'}
```

## How to Use It with an evaluator value
```typescript
import { ifIt, isNot } from '@asset-core/functional-js-utils';
const makeObject = () => ({ id: 'default-id'});

ifIt(isNot(true), makeObject)(null); // null
ifIt(isNot(false), makeObject)(null); // { id: 'default-id'}
```
