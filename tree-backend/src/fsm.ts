import { importRawNistEcPublicKey } from "./es256";
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

function once<T>(subscribable: Subscribable<T>): Subscribable<T> {
  return createReplayLast(subscribeFor(subscribable, 1));
}

function toPromise<T>(subscribable: Subscribable<T>): Promise<T> {
  const event = once(subscribable);
  return new Promise((resolve) => {
    const unsubscribe = event.subscribe((event) => {
      unsubscribe();
      resolve(event);
    });
  });
}

export type ValidatingState = {
  type: "validating_nodeid";
  start: () => void;
  nextState: Promise<FailedState | ChallengedState>;
};

export type FailedState = {
  type: "failed";
  error: ErrorResponse;
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
  const transition = createSubject<FailedState | ChallengedState>();

  return {
    type: "validating_nodeid",
    start: () => {
      const publicKeyBuffer = Buffer.from(nodeId, "base64");

      if (nodeId.length !== 65) {
        return transition.emit(
          failed(
            createBadKeyFormat(
              {
                message:
                  `Expected the tree ID to be a base64-encoded ` +
                  `NIST-format 65-byte ECDSA public key, but instead got a ` +
                  `key of length ${nodeId.length}`,
                key: nodeId,
              },
              "client"
            )
          )
        );
      }

      importRawNistEcPublicKey(publicKeyBuffer).then(
        (key) => {
          transition.emit(challenged(key));
        },
        (e) => {
          transition.emit(
            failed(
              createBadKeyFormat(
                {
                  message: "An error occurred attempting to parse the key",
                  key: nodeId,
                  errorObject: e,
                },
                "unsure"
              )
            )
          );
        }
      );
    },
    nextState: toPromise(transition),
  };
}

function failed(error: BadKeyError): FailedState {
  return {
    type: "failed",
    error,
  };
}

function challenged(key: CryptoKey): ChallengedState {
  const transition = createSubject<DoneState>();

  return {
    type: "client_challenged",
    onTransition: once(transition),
    handle: (value: unknown) => {},
  };
}

function done(): DoneState {
  return {
    type: "done",
  };
}
