import WebSocket, { WebSocketServer } from "ws";
import { Patterns } from "./path-matcher";
import {
  // sendBadURLPathError,
  sendNodeIdInUseError,
} from "./messsages/server-message";
import Tree from "./Tree";
import { IncomingMessage } from "http";
import { strict as assert } from "assert";
import Node from "./Node";
import RootNodeManager from "./root-node";
import { sendBadURLPathError } from "./messsages/server-errors";

function parseNumber(value: string): number | null {
  const result = parseInt(value);
  return isNaN(result) ? null : result;
}

const port = parseNumber(process.env.PORT || "") || 3030;

const wss = new WebSocketServer({ port });

type NodeValue = {
  socket: WebSocket;
  state: {};
};

const trees = new Map<string, Tree<string, NodeValue>>();

function getTree(id: string) {
  let tree = trees.get(id);
  if (!tree) {
    tree = new Tree();
    tree.treeChangeEvents.subscribe((tree) => {
      if (tree.isEmpty) {
        removeTree(id);
      }
    });
    trees.set(id, tree);
  }
  return tree;
}

function removeTree(id: string) {
  trees.delete(id);
}

type PatternValue = {
  ws: WebSocket;
  request: IncomingMessage;
};

const patterns = new Patterns<PatternValue>();

patterns.register("/trees/:treeId/view", ({ params, value: { ws } }) => {
  const treeId = params.get("treeId");
  assert(typeof treeId === "string");

  const tree = getTree(treeId);

  tree.insertNode(new Node(nodeId, { socket: ws, state: {} }));
  ws.on("close", () => {
    tree.removeValueByKey(nodeId);
  });
});
patterns.register(
  "/trees/:treeId/view/structure-only",
  ({ params, value: { ws } }) => {
    const treeId = params.get("treeId");
    assert(typeof treeId === "string");

    const tree = getTree(treeId);
    const unsubscribe = tree.treeChangeEvents.subscribe((tree) => {
      if (tree.rootNode) {
        const result = Node.map(tree.rootNode, (value) => value.state);
      }
    });
    ws.on("close", () => {
      unsubscribe();
    });
  }
);

patterns.register("/trees/:treeId/broadcast", ({ params, value: { ws } }) => {
  const treeId = params.get("treeId");
  assert(typeof treeId === "string");

  const tree = getTree(treeId);

  if (tree.has(treeId)) {
    sendNodeIdInUseError(ws);
    if (tree.isEmpty) {
      removeTree(treeId);
    }
  }

  new RootNodeManager(ws, treeId);

  ws.on("close", () => {
    tree.removeValueByKey(treeId);
  });
});

wss.on("connection", (ws, request) => {
  if (request.url) {
    patterns.dispatch(request.url, { ws, request });
  } else {
    if (typeof request.url !== "string") {
      sendBadURLPathError(ws, request.url);
    } else {
    }
    ws.close();
  }
});
