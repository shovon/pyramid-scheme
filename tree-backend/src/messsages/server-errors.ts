import WebSocket from "ws";
import { NodeState } from "../node-validation-machine";
import { InferType } from "../validator";
import { awaitingResponseSchema } from "./client-message";
import { sendMessage } from "./server-message";

export type ErrorObject = {
  id?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
    [key: string]: any;
  };
  meta?: any;
};

export type ClientError = {
  error: {
    type: "CLIENT_ERROR";
    errors: ErrorObject[];
    errorOriginator: "client";
    responseTo: string;
  };
};

export function sendClientError(
  ws: WebSocket,
  errors: ErrorObject[],
  messageId: string
) {
  sendMessage(ws, {
    error: {
      type: "CLIENT_ERROR",
      errors,
      responseTo: messageId,
      errorOriginator: "client",
    },
  });
}

export function sendChallengeFailed(
  ws: WebSocket,
  message: string,
  publicKey: string,
  signature: string,
  messageId: string
) {
  sendClientError(
    ws,
    [
      {
        title: "Challenge failed",
        detail: "Signature verification against the supplied message failed",
        meta: {
          publicKey,
          message,
          signature,
        },
      },
    ],
    messageId
  );
}

export function sendBadPayloadForInvalidState(
  ws: WebSocket,
  currentState: NodeState["type"],
  expectedMessageTypes: InferType<typeof awaitingResponseSchema>["type"][],
  error: any,
  messageId: string
) {
  sendClientError(
    ws,
    [
      {
        title: "Got message from broadcaster, in invalid state",
        detail: `The current state of the application is ${currentState}, and the only acceptable message types are [${expectedMessageTypes.join(
          ","
        )}]`,
        meta: error,
      },
    ],
    messageId
  );
}

export type BadIncomingMessageError = {
  error: {
    type: "BAD_INCOMING_MESSAGE";
    errors: [
      {
        title: "Got a bad message";
        detail: "The message body was just bad. Please view the meta field for further details";
        meta?: any;
      }
    ];
    errorOriginator: "client";
  };
};

export function sendBadMessagePayload(ws: WebSocket, error: any) {
  const message: BadIncomingMessageError = {
    error: {
      type: "BAD_INCOMING_MESSAGE",
      errors: [
        {
          title: "Got a bad message",
          detail:
            "The message body was just bad. Please view the meta field for further details",
          meta: error,
        },
      ],
      errorOriginator: "client",
    },
  };
  sendMessage(ws, message);
}

export type BadURLPathError = {
  error: {
    type: "BAD_URL_ERROR";
    errors: [
      {
        title: "Got a bad URL";
        detail: string;
      }
    ];
    errorOriginator: "client";
  };
};

export function sendBadURLPathError(ws: WebSocket, url: string) {
  const message: ErrorResponse = {
    error: {
      type: "BAD_URL_ERROR",
      errors: [
        {
          title: "Got a bad URL",
          detail: `The URL path "${url}" is not found`,
        },
      ],
      errorOriginator: "client",
    },
  };
  sendMessage(ws, message);
}

export type FatalError = {
  error: {
    type: "FATAL_ERROR";
    errors: ErrorObject[];
    errorOriginator: "server";
  };
};

export function sendFatalError(ws: WebSocket, error: any) {
  sendMessage(ws, {
    error: {
      type: "FATAL_ERROR",
      errors: [
        {
          title: "An unknown server error occurred",
          meta: error,
        },
      ],
      errorOriginator: "server",
    },
  });
}

export type MessageProcessingError = {
  error: {
    type: "MESSAGE_PROCESSING_ERROR";
    errors: ErrorObject[];
    responseTo: string;
    errorOriginator: "server";
  };
};

export function sendFatalErrorWithMessageId(
  ws: WebSocket,
  errors: ErrorObject[],
  messageId: string
) {
  sendMessage(ws, {
    error: {
      type: "MESSAGE_PROCESSING_ERROR",
      errors,
      errorOriginator: "server",
      responseTo: messageId,
    },
  });
}

export type NodeIdInUseError = {
  error: {
    type: "NODE_ID_IN_USE";
    errors: [
      {
        title: "Node ID is in use";
        detail: string;
      }
    ];
    errorOriginator: "client";
  };
};

export function sendAlreadyHaveChallengeResponse(
  ws: WebSocket,
  messageId: string
) {
  sendClientError(
    ws,
    [
      {
        title: "Already got challenge response",
        detail:
          "The WebSocket connection has already supplied with a challenge response",
      },
    ],
    messageId
  );
}

export function sendNodeIdInUseError(ws: WebSocket, nodeId: string) {
  const nodeInUseError: NodeIdInUseError = {
    error: {
      type: "NODE_ID_IN_USE",
      errors: [
        {
          title: "Node ID is in use",
          detail: `The node ID "${nodeId}" is already in use`,
        },
      ],
      errorOriginator: "client",
    },
  };
  sendMessage(ws, nodeInUseError);
}

export type StillProcessingNodeIdError = {
  errors: {
    type: "PROCESSING_TREE_ID";
    errors: [
      {
        title: "Tree ID still processing";
        detail: "The tree ID needs to be processed, and it is done asynchronously. Please wait until a challenge is provided";
      }
    ];
    errorOriginator: "server";
  };
};

export function sendStillProcessingNodeIdError(ws: WebSocket) {
  const error: StillProcessingNodeIdError = {
    errors: {
      type: "PROCESSING_TREE_ID",
      errors: [
        {
          title: "Tree ID still processing",
          detail:
            "The tree ID needs to be processed, and it is done asynchronously. Please wait until a challenge is provided",
        },
      ],
      errorOriginator: "server",
    },
  };
  sendMessage(ws, error);
}

export type BadKeyError = {
  error: {
    type: "BAD_KEY_FORMAT";
    errors: [
      {
        title: "Tree ID is in an unparsable format";
        detail: string;
        meta: {
          key: string;
          errorObject: any;
        };
      }
    ];
    errorOriginator: "client" | "unsure";
  };
};

export function sendBadKeyError(
  ws: WebSocket,
  {
    message,
    key,
    errorObject,
  }: { message: string; key: string; errorObject?: any },
  originator: "client" | "unsure"
) {
  const error: BadKeyError = {
    error: {
      type: "BAD_KEY_FORMAT",
      errors: [
        {
          title: "Tree ID is in an unparsable format",
          detail: message,
          meta: {
            key,
            errorObject,
          },
        },
      ],
      errorOriginator: originator,
    },
  };
  sendMessage(ws, error);
}

export type NoPathAvailable = {
  error: {
    type: "NO_PATH_AVAILABLE";
    errors: [
      {
        title: "WebSocket request path not available";
        detail: "A request URL path was not available when processing the HTTP upgrade request for the purposes of establishing a WebSocket connection";
      }
    ];
    errorOriginator: "unsure";
  };
};

export function sendNoURLProvidedError(ws: WebSocket) {
  const error: NoPathAvailable = {
    error: {
      type: "NO_PATH_AVAILABLE",
      errors: [
        {
          title: "WebSocket request path not available",
          detail:
            "A request URL path was not available when processing the HTTP upgrade request for the purposes of establishing a WebSocket connection",
        },
      ],
      errorOriginator: "unsure",
    },
  };
  sendMessage(ws, error);
}

export type ErrorResponse =
  | ClientError
  | BadIncomingMessageError
  | BadURLPathError
  | MessageProcessingError
  | FatalError
  | StillProcessingNodeIdError
  | NodeIdInUseError
  | BadKeyError
  | NoPathAvailable;
