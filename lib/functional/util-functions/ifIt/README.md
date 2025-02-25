# ifIt Function

A Function that allows code to execute if an evaluator is true, very similar to an either only with a single path.

---

## The Code

```typescript
type EvaluatorType = Function | any;

export const ifIt = curry((evaluator: EvaluatorType, fn: Function, value) => {
  const evaluated = typeof evaluator === 'function'
    ? evaluator(value)
    : evaluator
  return Boolean(evaluated) ? fn(value) : value;
});
```

---

## How to Use It with an evaluator function

```typescript
import { ifIt } from '@asset-core/functional-js-utils';

const hasNoIdProperty = ({id}) => Boolean(id);
const setUUID = (object) => ({...object, id: uuid()});

const setDefaultId = ifIt(hasNoIdProperty, setUUID);

setDefaultId({}); // {id: 'uuid'}
setDefaultId({id: 'uuid123'}) // {id: 'uuid123'}
```

## How to Use It with an evaluator value
```typescript
import { ifIt } from '@asset-core/functional-js-utils';
import { shouldDefaultId } from 'config';

const hasNoIdProperty = ({id}) => Boolean(id);
const setUUID = (object) => ({...object, id: uuid()});
// shouldDefaultId = true;
ifIt(shouldDefaultId, setUUID, {}); // {id: 'uuid'}

// shouldDefaultId = false;
ifIt(shouldDefaultId, setUUID, {}); // {}
```
