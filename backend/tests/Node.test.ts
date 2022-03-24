import Node from "../Node";
import { strict as assert } from "assert";

const root = new Node<string, string>("a", "apple");

root.insertNode(new Node("b", "banana"));
root.insertNode(new Node("c", "cherry"));
root.insertNode(new Node("d", "durian"));
root.insertNode(new Node("e", "elderberry"));
root.insertNode(new Node("f", "fig"));

const expected1 = {
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

assert.deepEqual(
  JSON.parse(JSON.stringify(Node.noParents(root))),
  expected1,
  "Insert"
);

root.deleteNodeByKey("b");

const expected2 = {
  key: "a",
  value: "apple",
  left: {
    key: "d",
    value: "durian",
    left: {
      key: "e",
      value: "elderberry",
      left: null,
      right: null,
    },
    right: null,
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

assert.deepEqual(
  JSON.parse(JSON.stringify(Node.noParents(root))),
  expected2,
  "Delete"
);
