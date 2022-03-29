import WebSocket from "ws";

export const noPathSuppliedErrorMessage =
  "No URL path supplied in upgrade request";

export type ErrorObject = {
  id?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
    [key: string]: any;
  };
};

export type ErrorResponse = {
  errors: ErrorObject[];
};

type Challenge = {
  type: "CHALLENGE";
  data: string;
};

export type Message = ErrorResponse | { payload: Challenge };

export function sendError(ws: WebSocket, errors: ErrorObject[]) {
  sendMessage(ws, { errors });
}

export function sendChallenge(ws: WebSocket, challenge: string) {
  sendMessage(ws, { payload: { type: "CHALLENGE", data: challenge } });
}

export function sendMessage(ws: WebSocket, message: Message) {
  ws.send(JSON.stringify(message));
}
