// This is a path matcher library that matches

import { strict as assert } from "assert";

function isParam(segment: string) {
  return segment.startsWith(":");
}

export interface MapLike<K, V> {
  get(key: K): V | undefined | null;
  entries(): Iterable<[K, V]>;
}

export type Match = {
  params: MapLike<string, string>;
  query: MapLike<string, string>;
};

/**
 * This is a path matcher library, that matches a pattern against the supplied
 * path
 * @param pattern The pattern to match the path against
 * @param path The path to match against the pattern
 * @returns Either a `Match` result, if there was a successful match; null
 *   otherwise
 */
export function match(pattern: string, path: string): Match | null {
  assert(pattern.startsWith("/"));

  const [, ...patternSegments] = pattern.split("/");

  const [inputPath, query] = path.split("?");

  const [, ...pathSegments] = inputPath.split("/");

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params = new Map<string, string>();

  for (const [index, segment] of patternSegments.entries()) {
    if (isParam(segment)) {
      params.set(segment.slice(1), pathSegments[index]);
    } else {
      if (segment !== pathSegments[index]) {
        return null;
      }
    }
  }

  return { params, query: new URLSearchParams(query || "") };
}

type HandlerValue<T> = Match & { value: T };

type Handler<T> = (result: HandlerValue<T>) => void;

/**
 * A nice class that matches paths with handlers.
 *
 * Works similarly to Node.js' Express or Koa
 */
export class Patterns<T> {
  private patterns: Map<string, Handler<T>> = new Map();

  register(pattern: string, handler: Handler<T>): Patterns<T> {
    this.patterns.set(pattern, handler);
    return this;
  }

  dispatch(path: string, value: T) {
    for (const [pattern, handler] of this.patterns.entries()) {
      const matched = match(pattern, path);
      if (matched) {
        handler({ ...matched, value });
        break;
      }
    }
  }
}
