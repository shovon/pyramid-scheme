import WebSocket, { WebSocketServer } from "ws";
import { Patterns } from "./path-matcher";
import { noPathSuppliedErrorMessage, sendError } from "./messsages/message";
import Tree from "./Tree";
import { IncomingMessage } from "http";
import { strict as assert } from "assert";
import Node from "./Node";

function parseNumber(value: string): number | null {
  const result = parseInt(value);
  return isNaN(result) ? null : result;
}

const port = parseNumber(process.env.PORT || "") || 3030;

const wss = new WebSocketServer({ port });

type TreeValue = {};

const trees = new Map<string, Tree<string, TreeValue>>();

function getTree(id: string) {
  let tree = trees.get(id);
  if (!tree) {
    tree = new Tree();
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

patterns.register(
  "/trees/:treeId/view",
  ({ params, value: { ws, request } }) => {
    const treeId = params.get("treeId");
    if (typeof treeId !== "string") {
      throw new Error("Failed to set the tree ID");
    }
    const tree = getTree(treeId);
    // tree.insertNode(new Node());
    ws.on("close", () => {});
  }
);
patterns.register(
  "/trees/:treeId/view/structure-only",
  ({ params, value: { ws, request } }) => {}
);
patterns.register(
  "/trees/:treeId/broadcast",
  ({ params, value: { ws, request } }) => {}
);

wss.on("connection", (ws, request) => {
  if (request.url) {
    patterns.dispatch(request.url, { ws, request });
  } else {
    sendError(ws, {
      errors: [
        {
          title: noPathSuppliedErrorMessage,
          detail:
            "In the HTTP/WebSocket upgrade request, a URL path was not " +
            "provided, and thus can't make sense of the WebSocket connection",
        },
      ],
    });
    ws.close();
  }
});
