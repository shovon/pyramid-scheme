import WebSocket from "ws";
import { ErrorResponse } from "./server-errors";

export const noPathSuppliedErrorMessage =
  "No URL path supplied in upgrade request";

type Challenge = {
  type: "CHALLENGE";
  data: string;
};

export type Message = ErrorResponse | { payload: Challenge };

export function sendChallenge(ws: WebSocket, challenge: string) {
  sendMessage(ws, { payload: { type: "CHALLENGE", data: challenge } });
}

export function sendMessage(ws: WebSocket, message: Message) {
  ws.send(JSON.stringify(message));
}
