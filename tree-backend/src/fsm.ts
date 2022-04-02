import { BadKeyError, createBadKeyFormat } from "./messsages/server-errors";
import { createReplayLast, createSubject, Subscribable } from "./subscriber";

export type ValidatingState = {
  type: "validating_nodeid";
  onTransition: Subscribable<FailedState | ChallengedState>;
};

export type FailedState = {
  type: "failed";
};

export type ChallengedState = {
  type: "client_challenged";
  onTransition: Subscribable<FailedState | DoneState>;
  handle: (value: unknown) => void;
};

export type DoneState = {
  type: "done";
};

export function validating(nodeId: string): ValidatingState {
  // This is going to be validating a Node ID.
  //
  // Upon validation, a challenge value is going to be available as an input to
  // the next step

  const transition = createSubject<FailedState | ChallengedState>();

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

  return {
    type: "validating_nodeid",
    onTransition: createReplayLast(transition),
  };
}

function failed(error: BadKeyError): FailedState {
  return {
    type: "failed",
  };
}

function challenged(): ChallengedState {
  const transition = createSubject<DoneState>();

  return {
    type: "client_challenged",
    onTransition: createReplayLast(transition),
    handle: (value: unknown) => {
      // TODO: add a handler here
    },
  };
}

function done(): DoneState {
  return {
    type: "done",
  };
}
