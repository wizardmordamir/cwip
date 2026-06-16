export type Maybe<T> = Just<T> | Nothing<T>;

export class Just<T> {
  readonly tag = 'Just';

  // 1. The wrapper holds the value
  constructor(private value: T) {}

  // 2. The unit/of function wraps a value
  static of<U>(v: U): Just<U> {
    return new Just(v);
  }

  // 3. The bind/flatMap method to chain transformations
  bind<U>(f: (v: T) => Maybe<U>): Maybe<U> {
    return f(this.value);
  }

  chain = this.bind;
  flatMap = this.bind;

  map<U>(f: (v: T) => U): Maybe<U> {
    return new Just(f(this.value));
  }

  str() {
    return `Just(${this.value})`;
  }
}

export class Nothing<T> {
  readonly tag = 'Nothing';

  bind<U>(_f: (v: T) => Maybe<U>): Maybe<U> {
    return new Nothing<U>();
  }

  map<U>(_f: (v: T) => U): Maybe<U> {
    return new Nothing<U>();
  }

  str() {
    return `Nothing()`;
  }
}
