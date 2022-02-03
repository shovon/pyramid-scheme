import { createServer, Server } from "http";
import WebSocket, { WebSocketServer } from "ws";

const port = 3030;

const server = createServer();

const broadcastWss = new WebSocketServer({ noServer: true });
const audienceWss = new WebSocketServer({ noServer: true });

const broadcasts = new Map<string, Tree<WebSocket>>();

type ID = string;

broadcastWss.on("connection", (ws, request) => {
  if (request.url) {
  } else {
    ws.close();
  }
});

audienceWss.on("connection", (ws, request) => {
  if (request.url) {
    const roomName = request.url.split("/")[2];
    let broadcast = broadcasts.get(roomName);
    if (!broadcast) {
      broadcast = new Tree();
      broadcasts.set(roomName, broadcast);
    }

    const id = broadcast.addNode(ws);

    ws.on("close", () => {
      broadcast.removeAudienceMember(id);
      if (broadcast.isEmpty) {
      }
    });
  } else {
    ws.close();
  }
});

class Tree<T> {
  private root?: Node<T>;

  addNode(value: T) {
    const node = new Node(value);
    if (!this.root) {
      this.root = node;
    } else {
      this.root.insert(node);
    }
  }

  removeNode(value: T) {}

  setRootNode(ws: WebSocket) {}

  get isEmpty() {
    return this.root === null;
  }
}

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
