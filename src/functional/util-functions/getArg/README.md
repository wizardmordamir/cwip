## getArg
  - used to return args/values, can be useful esspecially for eithers

### Arguments
  - `..args (any)`: the given args/values to be returned
  - `index (number)`: getArgAt will return the arg at the index requested

  ```js
  const getArg = (...args) => args[0]

  const getArgAt = (index) => (...args) => args[index]

  const getArgLast = (...args) => args[args.length -1]


  // Examples
  const someEvaluator = (value) => typeof value === 'string'

  const getArgExample = either(someEvaluator, leftFn, getArg)
  const getArgAtExample = either(someEvaluator, leftFn, getArgAt(1))
  const getArgLastExample = either(someEvaluator, leftFn, getArgLast)
  
  getArgExample('i am returned')
  getArgExample('i am returned', 'i am NOT')
  getArgAtExample('i am NOT returned', 'but i am')
  getArgLastExample('i am NOT returned', 'nor am i',  'but i am')

  ```