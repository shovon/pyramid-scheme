/*
Copyright 2022 Salehen Shovon Rahman

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * A generic type that represents a function whose sole purpose is to receive
 * a value.
 *
 * Useful when listening for an event
 */
export type Listener<T> = (value: T) => void;

/**
 * A subscribable event listener
 */
export type Subscribable<T> = {
  subscribe(listener: Listener<T>): () => void;
};

export type Subscriber<T> = {
  emit(value: T): void;
};

export type OperatorFunction<T, V> = (
  subscribable: Subscribable<T>
) => Subscribable<V>;

export type Subject<T> = Subscribable<T> & Subscriber<T>;

export const createSubject = <T>(): Subject<T> => {
  let listeners: Listener<T>[] = [];

  return {
    subscribe: (listener: Listener<T>) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
    emit: (value: T) => {
      for (const listener of listeners) {
        listener(value);
      }
    },
  };
};

export const createReplayLast = <T>(
  subscribable: Subscribable<T>
): Subscribable<T> => {
  type LastType = { type: "NOT_AVAILABLE" } | { type: "AVAILABLE"; value: T };

  let last: LastType = {
    type: "NOT_AVAILABLE",
  };
  return {
    subscribe: (listener) => {
      if (last.type === "AVAILABLE") {
        listener(last.value);
      }
      const unsubscribe = subscribable.subscribe(listener);
      return unsubscribe;
    },
  };
};

export const createSubscribable = <T>(
  fn: (subscriber: Subscriber<T>) => void
): Subscribable<T> => {
  const { subscribe, emit } = createSubject<T>();
  fn({ emit });
  return { subscribe };
};

export const map =
  <T, V>(fn: (v: T) => V): OperatorFunction<T, V> =>
  (subscribable) =>
    createSubscribable((s) => {
      subscribable.subscribe((v) => s.emit(fn(v)));
    });

export const filter =
  <T>(predicate: (v: T) => boolean): OperatorFunction<T, T> =>
  (subscribable) =>
    createSubscribable((s) => {
      subscribable.subscribe((v) => {
        if (predicate(v)) {
          s.emit(v);
        }
      });
    });

export const scan =
  <T, R>(
    fn: (previous: R, current: T) => R,
    initial: R
  ): OperatorFunction<T, R> =>
  (subscribable) =>
    createSubscribable((s) => {
      let accumulated: R = initial;
      subscribable.subscribe((v) => {
        accumulated = fn(accumulated, v);
        s.emit(accumulated);
      });
    });

export const identity = () => map((x) => x);

export const withIndex =
  <T>(): OperatorFunction<T, [number, T]> =>
  (subscribable) => {
    let index = 0;
    return createSubscribable((s) => {
      subscribable.subscribe((v) => s.emit([index++, v]));
    });
  };

export const interval = (time?: number) => {
  const subject = createSubject<undefined>();
  const int = setInterval(() => {
    subject.emit(undefined);
  }, time);
  return {
    ...subject,
    stop: () => {
      clearInterval(int);
    },
  };
};

export const compose =
  <T, V, R>(
    fn1: OperatorFunction<T, V>,
    fn2: OperatorFunction<V, R>
  ): OperatorFunction<T, R> =>
  (subscribable) =>
    fn2(fn1(subscribable));

export type WithEvent<T extends string, V extends unknown[]> = {
  addEventListener(eventName: T, cb: (...elements: V) => any): any;
};

export const fromEvent = <T extends string, V extends unknown[]>(
  obj: WithEvent<T, V>,
  name: T
): Subscribable<V> =>
  createSubscribable(({ emit }) =>
    obj.addEventListener(name, (...args) => emit(args))
  );

export const apply = <T, V>(
  s: Subscribable<T>,
  fn: OperatorFunction<T, V>
): Subscribable<V> => fn(s);
