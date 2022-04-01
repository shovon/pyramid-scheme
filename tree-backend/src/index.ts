import WebSocket, { WebSocketServer } from "ws";
import { Patterns } from "./path-matcher";
import Tree from "./Tree";
import { IncomingMessage } from "http";
import { strict as assert } from "assert";
import Node from "./Node";
import NodeValidationMachine from "./node-validation-machine";
import {
  sendBadURLPathError,
  sendNoURLProvidedError,
} from "./messsages/server-errors";
import { logger } from "./logger";

function parseNumber(value: string): number | null {
  const result = parseInt(value);
  return isNaN(result) ? null : result;
}

const port = parseNumber(process.env.PORT || "") || 3030;

logger.info({ port }, `About to start server at port ${port}`);
const wss = new WebSocketServer({ port });

type NodeValue = {
  socket: WebSocket;
  state: {};
};

const trees = new Map<string, Tree<string, NodeValue>>();

function getTree(id: string) {
  logger.trace(`Gettig tree of ID ${id}`);
  let tree = trees.get(id);
  if (!tree) {
    logger.trace(`Tree with ID ${id} not found. Creating a new one`);
    tree = new Tree();
    tree.treeChangeEvents.subscribe((tree) => {
      logger.debug("Tree is empty");
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

patterns.register(
  "/trees/:treeId/view/:nodeId",
  ({ params, value: { ws } }) => {
    const treeId = params.get("treeId");
    const nodeId = params.get("nodeId");
    assert(typeof treeId === "string");
    assert(typeof nodeId === "string");

    const tree = getTree(treeId);

    tree.insertNode(new Node(nodeId, { socket: ws, state: {} }));
    ws.on("close", () => {
      tree.removeValueByKey(nodeId);
    });
  }
);
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
      logger.debug("Connection to structure-only viewer has been closed");
      unsubscribe();
    });
  }
);

patterns.register("/trees/:treeId/broadcast", ({ params, value: { ws } }) => {
  const treeId = params.get("treeId");
  assert(typeof treeId === "string");

  new NodeValidationMachine(ws, treeId);

  ws.on("close", () => {
    logger.debug("The root node seems to have left the tree");
    // tree.removeValueByKey(treeId);
  });
});

wss.on("connection", (ws, request) => {
  logger.debug(
    {
      remoteAddress: request.socket.remoteAddress,
      url: request.url,
    },
    "Got a new connection"
  );
  if (request.url) {
    patterns.dispatch(request.url, { ws, request });
  } else {
    logger.debug("URL was empty");
    if (typeof request.url !== "string") {
      logger.trace("URL was not a string, for some reason");
      sendNoURLProvidedError(ws);
    } else {
      sendBadURLPathError(ws, request.url);
    }
    logger.debug("Closing the connection");
    ws.close();
  }
});
