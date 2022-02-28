import { Message } from "./message/message";
import { MessageToNodeEventType } from "./message/MessageToNode";

interface MessageSender {
  send(message: any): void;
}

class Parent implements MessageSender {
  private pc: RTCPeerConnection = new RTCPeerConnection();
  constructor(private sender: MessageSender) {}

  terminate() {
    this.pc.close();
  }

  send(message: any) {
    this.sender.send(message);
  }
}

const parents = new Map<string, Parent>();

const ws = new WebSocket("ws://localhost:3030/broadcasts/thisissomething");

function sendWebSocketMessage(message: Message) {
  ws.send(JSON.stringify(message));
}

type ParentHelloMessage = {
  type: "HELLO";
};

type ParentMessage = ParentHelloMessage;

function sendParentMessage(to: string, payload: ParentMessage) {
  sendWebSocketMessage({
    type: "",
    data: {
      to,
      payload,
    },
  });
}

type ChildHiMessage = {
  type: "HI";
};

type ChildMessage = ChildHiMessage;

function sendChildHiMessage(to: string, payload: ChildMessage) {
  sendWebSocketMessage({
    type: MessageToNodeEventType,
    data: {
      to,
      payload,
    },
  });
}

ws.onmessage = (event) => {
  console.log(event.data);

  const handlers: { [key: string]: (data: any) => void } = {
    NODE_STATE: (data: any) => {
      if (data.parent && typeof data.parent.id === "string") {
        let parent = parents.get(data.parent.id);
        if (!parent) {
          parent = new Parent({
            send(message: ParentMessage) {
              ws.send(JSON.stringify(message));
            },
          });
          parents.set(data.parent.id, parent);
        }
      }
    },
  };

  const parsed = JSON.parse(event.data);
  if (typeof parsed.type === "string") {
    const { type, data } = parsed;
    const handler = handlers[type];
    if (typeof handler === "function") {
      handler(data);
    }
  }
};

export {};
