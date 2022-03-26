import WebSocket from "ws";

export const noPathSuppliedErrorMessage =
  "No URL path supplied in upgrade request";

export type ErrorResponse = {
  id?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
    [key: string]: any;
  };
};

export type ErrorObject = {
  errors: ErrorResponse[];
};

export function sendError(ws: WebSocket, error: ErrorObject) {
  ws.send(JSON.stringify(error));
}
