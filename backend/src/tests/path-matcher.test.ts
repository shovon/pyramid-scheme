import { MapLike, match } from "../path-matcher";
import { strict as assert } from "assert";

function assertEmpty(dict: MapLike<string, string>) {
  assert([...dict.entries()].length === 0);
}

const matched = match("/", "/");

assert(!!matched);
assertEmpty(matched.params);
assertEmpty(matched.query);
