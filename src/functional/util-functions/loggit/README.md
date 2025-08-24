## loggit
  - partially applied function that logs and returns the value for ease of putting in compose/pipe/map/then

### Arguments
  - `..args (any)`: additional values that when passed in will be added to the console.log
  - `value (any)`: the value logged and returned

  ```js
  loggit(...args)(value)

  // Examples
  
  
  const withMultipleArgsAndVariables = 'multiple args and variables'
  
  someAsyncCall() // returns 'return value'
    .then(loggit('works with',withMultipleArgsAndVariables)) // log: 'works with multiple args and variables return value' return: 'return value'
    .then(loggit('test')) // log: 'test return value' return: 'return value'
    .then(loggit()) // both log and return: 'return value'
  ```