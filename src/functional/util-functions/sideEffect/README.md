# sideEffect and asyncSideEffect Function

A function that accepts a side effect function and a value. it will call the side effect function with that value but will return the value instead of the result of the side affect call

asyncSideEffect awaits async function calls

---

## The Code

```typescript
type AnyFn = (...args: any) => any;
type SideEffect = (fn: AnyFn) => <T>(v: T) => T;
export const sideEffect: SideEffect = (fn) => (v) => {
  fn(v);
  return v;
}

type AnyFnAsync = (...args: any) => Promise<any>;
type AsyncSideEffect = (fn: AnyFnAsync) => <T>(v: T) => Promise<T>;
export const asyncSideEffect: AsyncSideEffect = (fn) => async (v) => {
  await fn(v);
  return Promise.resolve(v);
}


```

---

## How to Use It with existing functions

```typescript
import { sideEffect, pipe } from '@asset-core/functional-js-utils'
const value = 'original-value';
const fn = (v) => console.log(v)
const fnNoV = () => console.log('im inside the pipe')
const sideEffectFnWithReturn = () => 'returning a new value';
const result = pipe(
  sideEffect(fnNo), // console: 'im inside the pipe'
  sideEffect(sideEffectFnWithReturn),
  sideEffect(fn), // console: 'original-value'
)(value)

result // 'original-value'
```

## How to Use It with prewrapped sideEffects

```typescript
import { sideEffect, pipe } from '@asset-core/functional-js-utils'
const value = 'original-value';
const sideEffectFn = sideEffect((v) => console.log(v));
const sideEffectFnNoV =  sideEffect(() => console.log('im inside the pipe'));
const sideEffectFnWithReturn = sideEffect(() => 'returning a new value');

const result = pipe(
  sideEffectFnNoV, // console: 'im inside the pipe'
  sideEffectFnWithReturn,
  sideEffectFn, // console: 'original-value'
)(value)

result // 'original-value'
```
