## isObject
  - function that will return true for javascript objects and false for non javascript objects

### Arguments
  - `value (any)`: The value to process

  ```js
  isObject(value: any)

  // Examples
  isObject({ test: 'test'}) // true
  isObject([object]) // false
  isObject('{}') // false
  isObject(1) // false
  isObject((v) => object) // false
  isObject(null) // false
  isObject(undefined) // false
  ```