## getValue
- function that will return an object path's value when given an object and the path as an array

### Arguments
  - `object (Object)`: The object to process
  - `path (Array)`: The path used to traverse object to get value

```js
getValue(object: object, path: string[])

// Examples
const object = {
  a: {
    b: {
      c: 1
    }
  }
}
const path = ['a', 'b', 'c'];
const badPath = [...path, 'd'];

getValue(object, path); // 1
getValue(object, badPath); // undefined
```