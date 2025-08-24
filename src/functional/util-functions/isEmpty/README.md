## isEmpty
  - function that will check whether an array or object contains values, and returns a boolean.

### Arguments
  - `value (Object or Array)`: The array or object to process

  ```js
  isEmpty(value: object|any[])

  // Examples
  isEmpty({}) // true
  isEmpty([]) // true
  isEmpty({ a: 1 }) // false
  isEmtpy([1, 2]) // false
  ```