import { createServer, Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import Node, { AbstractNode } from "./Node";
import Tree from "./Tree";

const port = 3030;

const server = createServer();

const broadcastWss = new WebSocketServer({ noServer: true });
const audienceWss = new WebSocketServer({ noServer: true });

type Client = WebSocket;

type ID = string;

const rooms = new Map<ID, Tree<ID, Client>>();

broadcastWss.on("connection", (ws, request) => {
  if (request.url) {
  } else {
    ws.close();
  }
});

let count = 0;
function nextId() {
  return (count++).toString();
}

type NodeMeta = {
  id: ID;
};

type NodeStateMessage = {
  type: "NODE_STATE";
  data: {
    selfNode: NodeMeta;
    parent: NodeMeta | null;
    children: NodeMeta[];
  };
};

type EssentialNode<K> = {
  readonly key: K;
  readonly children: EssentialNode<K>[];
};

function essentialNode<K, V>(node: AbstractNode<K, V>): EssentialNode<K> {
  return {
    get key() {
      return node.key;
    },
    get children() {
      return node.children.map(essentialNode);
    },
  };
}

type GraphStateMessage = {
  type: "GRAPH_STATE";
  data: EssentialNode<ID>;
};

type RelayedNodeMessage = {
  type: "MESSAGE";
  data: {
    from: ID;
    to: ID;
    payload: any;
  };
};

type Message = NodeStateMessage | RelayedNodeMessage | GraphStateMessage;

function getNodeMeta(node: AbstractNode<ID, Client>): NodeMeta {
  return {
    id: node.key,
  };
}

function createNodeStateMessage(
  node: AbstractNode<ID, Client>
): NodeStateMessage {
  return {
    type: "NODE_STATE",
    data: {
      selfNode: getNodeMeta(node),
      parent: node.parent ? getNodeMeta(node) : null,
      children: node.children.map(getNodeMeta),
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
  node: AbstractNode<ID, Client>
): GraphStateMessage {
  return {
    type: "GRAPH_STATE",
    data: essentialNode(node),
  };
}

function sendMessage(ws: WebSocket, message: Message) {
  ws.send(JSON.stringify(message));
}

function sendNodeState(node: AbstractNode<ID, Client>) {
  sendMessage(node.value, createNodeStateMessage(node));
  sendMessage(node.value, createGraphStateMessage(node));
}

function broadcastRoomState(broadcast: Tree<ID, Client>) {
  for (const node of broadcast) {
    sendNodeState(node);
  }
}

audienceWss.on("connection", (ws, request) => {
  if (request.url) {
    const roomName = request.url.split("/")[2];
    let room = rooms.get(roomName) || new Tree();
    if (!rooms.has(roomName)) {
      rooms.set(roomName, room);
    }
    const id = nextId();

    const node = new Node(id, ws);

    room.insertNode(node);

    broadcastRoomState(room);

    ws.on("close", () => {
      room.removeNodeByKey(id);
      if (room.isEmpty) {
        rooms.delete(id);
      } else {
        broadcastRoomState(room);
      }
    });

    ws.on("message", (message) => {
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
    });
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
