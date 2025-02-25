## arrayChunker
  - function that will break a given array into arrays of a specified size

### Arguments
  - `array (Array)`: The array to process
  - `chunkSize (Number)`: The size of each chunk

  ```js
  arrayChunker(array: any[], columns<number>)

  // Examples
  arrayChunker([1, 2, 3, 4], 2) // [[1, 2], [3, 4]]
  arrayChunker([1, 2, 3, 4], 3) // [[1, 2, 3], [4]]
  arrayChunker([1, 2, 3, 4, 5], 6) // [[1, 2, 3, 4, 5, 6]]
  arrayChunker([], 2) // []
  ```