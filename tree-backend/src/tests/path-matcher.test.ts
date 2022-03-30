import { MapLike, match, Patterns } from "../path-matcher";
import { strict as assert } from "assert";

function assertEmpty(dict: MapLike<string, string>) {
  assertLength(dict, 0);
}

function assertLength(dict: MapLike<string, string>, length: number) {
  assert.equal([...dict.entries()].length, length);
}

{
  const matched = match("/", "/sweet");
  assert.equal(matched, null);
}

{
  const matched = match("/sweet", "/");
  assert.equal(matched, null);
}

{
  const matched = match("/", "/");

  assert(!!matched);
  assertEmpty(matched.params);
  assertEmpty(matched.query);
}

{
  const matched = match("/sweet", "/sweet");
  assert(!!matched);
  assertEmpty(matched.params);
  assertEmpty(matched.query);
}

{
  const matched = match("/foo/bar", "/foo/bar");
  assert(!!matched);
  assertEmpty(matched.params);
  assertEmpty(matched.query);
}

{
  const matched = match("/foo/bar/baz", "/foo/bar/baz?something=another");
  assert(!!matched);
  assertEmpty(matched.params);
  assertLength(matched.query, 1);
  assert.equal(matched.query.get("something"), "another");
}

{
  const matched = match("/foo/bar/:baz", "/foo/bar/10");
  assert(!!matched);
  assertLength(matched.params, 1);
  assert.equal(matched.params.get("baz"), "10");
  assertEmpty(matched.query);
}

{
  const matched = match("/:foo/:bar/:baz", "/1/2/3");
  assert(!!matched);
  assertLength(matched.params, 3);
  assert.equal(matched.params.get("foo"), "1");
  assert.equal(matched.params.get("bar"), "2");
  assert.equal(matched.params.get("baz"), "3");
  assertEmpty(matched.query);
}

{
  const matched = match("/:foo/:bar/:baz", "/1/2/3?something=another");
  assert(!!matched);
  assertLength(matched.params, 3);
  assert.equal(matched.params.get("foo"), "1");
  assert.equal(matched.params.get("bar"), "2");
  assert.equal(matched.params.get("baz"), "3");
  assertLength(matched.query, 1);
  assert.equal(matched.query.get("something"), "another");
}

{
  const matched = match("/:foo/:bar/:baz", "/foo/bar/baz?something=another");
  assert(!!matched);
  assertLength(matched.params, 3);
  assert.equal(matched.params.get("foo"), "foo");
  assert.equal(matched.params.get("bar"), "bar");
  assert.equal(matched.params.get("baz"), "baz");
  assertLength(matched.query, 1);
  assert.equal(matched.query.get("something"), "another");
}

{
  const patterns = new Patterns<"value">();

  let handled = false;

  patterns
    .register("/", (matched) => {
      handled = true;
      assert(!!matched);
      assertEmpty(matched.params);
      assertEmpty(matched.query);
    })
    .register("/something", (matched) => {
      throw new Error("Not supposed to be here");
    });

  patterns.dispatch("/", "value");

  assert(handled);
}
