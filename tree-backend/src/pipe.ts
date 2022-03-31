type Pipe<T> = {
  _<V>(fn: (value: T) => V): Pipe<V>;
  readonly value: T;
};

function start<T>(initial: T): Pipe<T> {
  return {
    _<V>(fn: (value: T) => V): Pipe<V> {
      return start(fn(initial));
    },
    get value() {
      return initial;
    },
  };
}