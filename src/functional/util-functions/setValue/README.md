# setValue Function

A Function that accepts a setter function and an object value that will return a new object with the object value spread into the result of calling the setter function with that object value.

---

## The Code

```typescript
type SetValue = <P extends object, R extends object>(setter: (v?: P) => R) => (value: P) => P & R

export const setValue: SetValue = (setter) => (value) => ({
  ...value,
  ...setter(value)
});

```

---

## How to Use It with an evaluator function

```typescript
import { setValue } from '@asset-core/functional-js-utils';
const object = { value0: 'value0' };
const setter = () => ({ value1: 'value1' })
const setterBasedOnValue = ({ value0 }) => ({ value1: value0 + 'value1' });

setValue(setter)(object) // { value0: 'value0', value1: 'value1' }
setValue(setterBasedOnValue)(object) // { value0: 'value0', value1: 'value0value1' }
```
