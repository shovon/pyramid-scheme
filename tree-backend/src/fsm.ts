import {
  BadKeyError,
  createBadKeyFormat,
  ErrorResponse,
} from "./messsages/server-errors";
import {
  createReplayLast,
  createSubject,
  Subscribable,
  subscribeFor,
} from "./subscriber";

export type ValidatingState = {
  type: "validating_nodeid";
  start: () => void;
  onTransition: Subscribable<FailedState | ChallengedState>;
};

export type FailedState = {
  type: "failed";
  error: ErrorResponse;
  done: true;
};

export type ChallengedState = {
  type: "client_challenged";
  onTransition: Subscribable<FailedState | DoneState>;
  handle: (value: unknown) => void;
};

export type DoneState = {
  type: "done";
  done: true;
};

export function validating(nodeId: string): ValidatingState {
  // This is the initial state

  const transition = createSubject<FailedState | ChallengedState>();

  return {
    type: "validating_nodeid",
    start: () => {
      if (nodeId.length !== 65) {
        transition.emit(
          failed(
            createBadKeyFormat(
              {
                message: `Expected the tree ID to be a base64-encoded NIST-format 65-byte ECDSA public key, but instead got a key of length ${nodeId.length}`,
                key: nodeId,
              },
              "client"
            )
          )
        );
      }
    },
    onTransition: createReplayLast(subscribeFor(transition, 1)),
  };
}

function failed(error: BadKeyError): FailedState {
  return {
    type: "failed",
    done: true,
    error,
  };
}

function challenged(): ChallengedState {
  const transition = createSubject<DoneState>();

  return {
    type: "client_challenged",
    onTransition: createReplayLast(transition),
    handle: (value: unknown) => {},
  };
}

function done(): DoneState {
  return {
    type: "done",
    done: true,
  };
}
