import { Message } from "./message/message";
import { MessageToNode, messageToNodeEventType } from "./message/MessageToNode";
import { MessageToNodePayload } from "./message/MessageToNodePayload";
import {
  MessageToParent,
  messageToParentEventType,
} from "./message/MessageToParent";

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

function messageToParent(payload: MessageToNodePayload) {
  const message: MessageToParent = {
    type: messageToParentEventType,
    data: payload,
  };
  sendWebSocketMessage(message);
}

ws.onmessage = (event) => {
  console.log(event.data);

  const handlers: { [key: string]: (data: any) => void } = {
    NODE_STATE: (data: any) => {
      if (data.parent && typeof data.parent.id === "string") {
        let parent = parents.get(data.parent.id);
        if (!parent) {
          parent = new Parent({
            send(message: MessageToNode) {
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
