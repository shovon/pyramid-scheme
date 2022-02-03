import Node from "../Node";
import { strict as assert } from "assert";

const root = new Node<string, string>("a", "apple");

root.insert(new Node("b", "banana"));
root.insert(new Node("c", "cherry"));
root.insert(new Node("d", "durian"));
root.insert(new Node("e", "elderberry"));
root.insert(new Node("f", "fig"));

const expected = {
  key: "a",
  value: "apple",
  left: {
    key: "b",
    value: "banana",
    left: {
      key: "d",
      value: "durian",
      left: null,
      right: null,
    },
    right: {
      key: "e",
      value: "elderberry",
      left: null,
      right: null,
    },
  },
  right: {
    key: "c",
    value: "cherry",
    left: {
      key: "f",
      value: "fig",
      left: null,
      right: null,
    },
    right: null,
  },
};

assert.deepEqual(JSON.parse(JSON.stringify(root.node)), expected);
