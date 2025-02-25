# ComposableObject Function

A Class that provides Static Methods to work with Object methods in a composable (pipe, compose) way.

## The Code

```typescript
export class ComposableObject {
  static keys = curry((
    fn: (value: string, index: number, array: string[]) => any,
    object: Record<string, any>
  ): any[] => {
    if (typeof object !== 'object') {
      return ['Error:Non Object Provided'];
    }

    return Object.keys(object).map(fn);
  })

  static values = curry((
    fn: (value: unknown, index: number, array: unknown[]) => any,
    object: Record<string, any>
  ): any[] => {
    if (typeof object !== 'object') {
      return ['Error:Non Object Provided'];
    }

    return Object.values(object).map(fn);
  })

  static entries = curry((
    fn: (value: [string, any], index: number, array: [string, any][]) => any,
    object: Record<string, any>
  ): any[] => {
    if (typeof object !== 'object') {
      return [['Error', 'Non Object Provided']];
    }

    return Object.entries(object).map(fn);
  })

  static mergeObjects = curry((
    overridingObject: Record<string, any>,
    baseObject: Record<string, any>
  ) => {
    if (typeof baseObject !== 'object' || typeof overridingObject !== 'object') {
      return { Error: 'Non Object Provided' };
    }

    return {
      ...baseObject,
      ...overridingObject,
    };
  })
}
```

---

## How to Use it

```typescript
const obj = {
  prop1: 'value1',
  prop2: 'value2',
  prop3: 'value3',
};
const fn = (keyValueTuple): string => keyValueTuple;

const result: unknown[] = ComposableObject.entries(fn, obj);
console.log(result); //[['prop1', 'value1'], ['prop2', 'value2'], ['prop3', 'value3']]
```

[Unit Test Examples](./objector.spec.ts)
