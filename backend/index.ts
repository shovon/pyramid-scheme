import { createServer, Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import Node, { AbstractNode } from "./Node";
import Tree from "./Tree";

const port = 3030;

const server = createServer();

const broadcastWss = new WebSocketServer({ noServer: true });
const audienceWss = new WebSocketServer({ noServer: true });

type NodeObject = WebSocket;

type ID = string;

const rooms = new Map<ID, Tree<ID, NodeObject>>();

const occupiedBroadcasters = new Set<string>();

function getRoomNameFromURPathL(
  urlPath: string | undefined
): string | undefined {
  if (!urlPath) {
    return;
  }
  return urlPath.split("/")[2];
}

function prepareRoom(roomName: string): Tree<ID, NodeObject> {
  let room = rooms.get(roomName) || new Tree();
  if (!rooms.has(roomName)) {
    rooms.set(roomName, room);
  }
  return room;
}

function sendBroadcasterAlreadyBroadcasting(ws: WebSocket) {
  sendMessage(ws, {
    type: "BROADCASTER_ALREADY_BROADCASTING",
    data: null,
  });
}

broadcastWss.on("connection", (ws, request) => {
  const roomName = getRoomNameFromURPathL(request.url);
  if (roomName) {
    if (occupiedBroadcasters.has(roomName)) {
      sendBroadcasterAlreadyBroadcasting(ws);
      ws.close();
      return;
    }
    occupiedBroadcasters.add(roomName);

    const room = prepareRoom(roomName);
    const id = nextId();
    const node = new Node(id, ws);

    room.setRootNode(node);

    broadcastRoomState(room);

    ws.on("close", () => {
      room.removeValueByKey(id);
      occupiedBroadcasters.delete(roomName);
      if (room.isEmpty) {
        rooms.delete(id);
      } else {
        broadcastRoomState(room);
      }
    });

    ws.on("message", handleMessage(node));
  } else {
    ws.close();
  }
});

let count = 0;
function nextId() {
  return (count++).toString();
}

type NodeStateMessage = {
  type: "NODE_STATE";
  data: {
    selfNode: NodeMeta;
    parent: NodeMeta | null;
    left: NodeMeta | null;
    right: NodeMeta | null;
  };
};

type EssentialNode<K> = {
  readonly key: K;
  readonly left: EssentialNode<K> | null;
  readonly right: EssentialNode<K> | null;
};

function essentialNode<K, V>(node: AbstractNode<K, V>): EssentialNode<K> {
  return {
    get key() {
      return node.key;
    },
    get left() {
      return node.left ? essentialNode(node.left) : null;
    },
    get right() {
      return node.right ? essentialNode(node.right) : null;
    },
  };
}

type GraphStateMessage = {
  type: "GRAPH_STATE";
  data: EssentialNode<ID> | null;
};

type RelayedNodeMessage = {
  type: "MESSAGE";
  data: {
    from: ID;
    to: ID;
    payload: any;
  };
};

type BroadcasterAlreadyBroadcastingMessage = {
  type: "BROADCASTER_ALREADY_BROADCASTING";
  data: null;
};

type Message =
  | NodeStateMessage
  | RelayedNodeMessage
  | GraphStateMessage
  | BroadcasterAlreadyBroadcastingMessage;

type NodeMeta = {
  id: ID;
};

function getNodeMeta(node: AbstractNode<ID, NodeObject>): NodeMeta {
  return {
    id: node.key,
  };
}

function createNodeStateMessage(
  node: AbstractNode<ID, NodeObject>
): NodeStateMessage {
  return {
    type: "NODE_STATE",
    data: {
      selfNode: getNodeMeta(node),
      parent: node.parent ? getNodeMeta(node) : null,
      left: node.left ? getNodeMeta(node.left) : null,
      right: node.right ? getNodeMeta(node.right) : null,
    },
  };
}

function createRelayMessage(
  { from, to }: { from: ID; to: ID },
  payload: any
): RelayedNodeMessage {
  return {
    type: "MESSAGE",
    data: {
      from,
      to,
      payload,
    },
  };
}

function createGraphStateMessage(
  node: AbstractNode<ID, NodeObject> | null
): GraphStateMessage {
  return {
    type: "GRAPH_STATE",
    data: node ? essentialNode(node) : null,
  };
}

function sendMessage(ws: WebSocket, message: Message) {
  ws.send(JSON.stringify(message));
}

function sendNodeState(node: AbstractNode<ID, NodeObject>) {
  sendMessage(node.value, createNodeStateMessage(node));
}

function sendGraphState(
  node: AbstractNode<ID, NodeObject>,
  tree: Tree<ID, NodeObject>
) {
  sendMessage(node.value, createGraphStateMessage(tree.rootNode));
}

function broadcastRoomState(room: Tree<ID, NodeObject>) {
  for (const node of room) {
    sendNodeState(node);
    sendGraphState(node, room);
  }
}

function handleMessage(node: Node<ID, NodeObject>) {
  return (message: WebSocket.RawData) => {
    const parsed = JSON.parse(message.toString());
    if (typeof parsed === "object") {
      switch (parsed.type) {
        case "MESSAGE":
          {
            if (!!parsed.data?.to) {
              const destinationNode = node.adjacentNodes.find(
                (node) => node.key === parsed.data.to
              );
              if (destinationNode) {
                sendMessage(
                  destinationNode.value,
                  createRelayMessage(
                    { from: node.key, to: parsed.data.to },
                    parsed.data.payload
                  )
                );
              }
            }
          }
          break;
      }
    }
  };
}

audienceWss.on("connection", (ws, request) => {
  const roomName = getRoomNameFromURPathL(request.url);
  if (roomName) {
    const room = prepareRoom(roomName);
    const id = nextId();
    const node = new Node(id, ws);

    room.insertNode(node);

    broadcastRoomState(room);

    ws.on("close", () => {
      room.removeValueByKey(id);
      if (room.isEmpty) {
        rooms.delete(id);
      } else {
        broadcastRoomState(room);
      }
    });

    ws.on("message", handleMessage(node));
  } else {
    ws.close();
  }
});

server.on("upgrade", (request, socket, head) => {
  if (request.url) {
    const parts = request.url.split("/");
    if (parts.length === 3 || parts.length === 4) {
      if (parts[1] === "broadcasts") {
        if (parts.length === 4 && parts[3] === "broadcaster") {
          broadcastWss.handleUpgrade(request, socket, head, function (ws) {
            broadcastWss.emit("connection", ws, request);
          });
          return;
        } else if (parts.length === 3) {
          audienceWss.handleUpgrade(request, socket, head, function (ws) {
            audienceWss.emit("connection", ws, request);
          });
          return;
        }
      }
    }
  }

  socket.destroy();
});

server.listen(port, function (this: Server) {
  console.log(this.address());
});
