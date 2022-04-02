import { createReplayLast, createSubject, Subscribable } from "./subscriber";

export type ValidatingState = {
  type: "validating_nodeid";
  transition: Subscribable<FailedState | ChallengedState>;
};

export type FailedState = {
  type: "failed";
};

export type ChallengedState = {
  type: "client_challenged";
  transition: Subscribable<FailedState | DoneState>;
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
    transition.emit(failed());
  }

  return {
    type: "validating_nodeid",
    transition: createReplayLast(transition),
  };
}

function failed(): FailedState {
  return {
    type: "failed",
  };
}

function challenged(): ChallengedState {
  const transition = createSubject<DoneState>();

  return {
    type: "client_challenged",
    transition: createReplayLast(transition),
    handle: (value: unknown) => {
      // TODO: add a handler here
    },
  };
}

function done() {
  return {
    type: "handshake_done",
    transition: () => {},
    handle: () => {},
  };
}
