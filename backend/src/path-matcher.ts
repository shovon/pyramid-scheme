// This is a path matcher library that matches

import { strict as assert } from "assert";

function isParam(segment: string) {
  return segment.startsWith(":");
}

interface MapLike<K, V> {
  get(key: K): V | undefined | null;
}

type Match = {
  params: MapLike<string, string>;
  query: MapLike<string, string>;
};

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
      params.set(segment, pathSegments[index]);
    } else {
      if (segment !== pathSegments[index]) {
        return null;
      }
    }
  }

  return { params, query: new URLSearchParams(query || "") };
}
