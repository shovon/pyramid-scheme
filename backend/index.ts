import { createServer, Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import Node from "./Node";
import Tree from "./Tree";

const port = 3030;

const server = createServer();

const broadcastWss = new WebSocketServer({ noServer: true });
const audienceWss = new WebSocketServer({ noServer: true });

type Client = WebSocket;

type ID = string;

const broadcasts = new Map<ID, Tree<ID, Client>>();

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

audienceWss.on("connection", (ws, request) => {
  if (request.url) {
    const roomName = request.url.split("/")[2];
    let broadcast = broadcasts.get(roomName) || new Tree();
    if (!broadcasts.has(roomName)) {
      broadcasts.set(roomName, broadcast);
    }
    const id = nextId();

    broadcast.insertNode(new Node(id, ws));

    ws.on("close", () => {
      broadcast.removeNode(id);
      if (broadcast.isEmpty) {
        broadcasts.delete(id);
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
