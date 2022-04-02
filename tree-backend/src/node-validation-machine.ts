import {
  sendAlreadyHaveChallengeResponse,
  sendBadKeyError,
  sendBadMessagePayload,
  sendBadPayloadForInvalidState,
  sendChallengeFailed,
  sendFatalError,
  sendFatalErrorWithMessageId,
  sendStillProcessingNodeIdError,
} from "./messsages/server-errors";
import * as crypto from "crypto";
import { InferType } from "./validator";
import { importRawNistEcPublicKey, verify } from "./es256";
import {
  awaitingResponseSchema,
  clientMessageSchema,
  messageSignatureSchema,
} from "./messsages/client-message";
import WebSocket from "ws";
import { sendChallenge } from "./messsages/server-message";
import { logger } from "./logger";
import { debug } from "console";

export type NodeState =
  | {
      type: "PREPARING_CHALLENGE";
    }
  | {
      type: "AWAITING_CHALLENGE_RESPONSE";
    }
  | {
      type: "VALIDATED";
    };

// NOTE: the code here could have been a lot simpler, honestly
/**
 * A state machine that will also send a few messages, on behalf of the client.
 */
export default class NodeValidationMachine {
  // This will represent the state of the machine.
  //
  // The initial state is going to represent that that the manager is reparing
  // the challenge
  private nodeState: NodeState = { type: "PREPARING_CHALLENGE" };

  // This is the challenge that is going to be used for determining whether the
  // new node is legitimate
  private challenge: Buffer = crypto.randomBytes(16);

  // The buffer that will serve as the 65-byte NIST-encoded ECDSA P-256 key
  private publicKeyBuffer: Buffer;

  // The WebCrypto's CryptoKey that will represent the ECDSA P-256 key
  private _ecdsaKey: CryptoKey | null = null;

  // Getes a promise, that will contain the CryptoKey
  get ecdsaKey(): Promise<CryptoKey> {
    logger.trace("A request was made to get the crypto key");
    if (this._ecdsaKey) {
      logger.trace(
        "A crypto key was already available. Resolving that, instead"
      );
      return Promise.resolve(this._ecdsaKey);
    }
    logger.trace(
      "No public key defined yet; creating a new one from the public key buffer"
    );
    return importRawNistEcPublicKey(this.publicKeyBuffer).then((key) => {
      this._ecdsaKey = key;
      return key;
    });
  }

  private badKey() {
    logger.debug(
      { publicKey: this.nodeId },
      "We were not provided with a valid public key as the Node ID; too short"
    );
    sendBadKeyError(
      this.ws,
      {
        message: `Expected the tree ID to be a base64-encoded NIST-format 65-byte ECDSA public key, but instead got a key of length ${this.publicKeyBuffer.length}`,
        key: this.nodeId,
      },
      "client"
    );
    logger.trace("Closing the connection, because of bad key");
    this.ws.close();
  }

  private async checkEcdsaKey() {
    try {
      await this.ecdsaKey;
      // Got the ECDSA key.
      //
      // Sending challenge.
      this.nodeState = { type: "AWAITING_CHALLENGE_RESPONSE" };
    } catch (e) {
      sendChallenge(this.ws, this.challenge.toString("base64"));
      // Notify to the user that the key is malformed
      sendBadKeyError(
        this.ws,
        {
          message: "An error occurred attempting to parse the key",
          key: this.nodeId,
          errorObject: e,
        },
        "unsure"
      );
      // And kill the connection
      this.ws.close();
    }
  }

  constructor(private ws: WebSocket, private nodeId: string) {
    logger.trace("Creating a new validation engine");

    // At initialization, the node state is at "PREPARING_CHALLENGE".
    //
    // This is because we are parsing the nodeId, and turning it into a key
    // that the ECDSA scheme can understand

    this.publicKeyBuffer = Buffer.from(nodeId, "base64");

    if (this.publicKeyBuffer.length !== 65) {
      this.badKey();
      return;
    }

    logger.trace("We have a valid public key");

    this.checkEcdsaKey().catch((e) => {
      logger.fatal(e);
    });

    // Handle all messages
    ws.addEventListener("message", (data) => {
      const dataValidation = clientMessageSchema.validate(data);
      if (!dataValidation.isValid) {
        sendBadMessagePayload(ws, dataValidation.error);
        return;
      }

      this.handleMessage(dataValidation.value).catch((e) => {
        sendFatalError(ws, e);
      });
    });
  }

  private async handleMessage(message: InferType<typeof clientMessageSchema>) {
    switch (this.nodeState.type) {
      case "PREPARING_CHALLENGE":
        {
          // Honestly, we shouldn't be here. So let the client know.
          sendStillProcessingNodeIdError(this.ws);
        }
        break;
      case "AWAITING_CHALLENGE_RESPONSE":
        {
          // Check the payload
          const payloadValidation = awaitingResponseSchema.validate(
            message.payload
          );
          if (!payloadValidation.isValid) {
            sendBadPayloadForInvalidState(
              this.ws,
              this.nodeState.type,
              ["CHALLENGE_RESPONSE"],
              payloadValidation.error,
              message.messageId
            );
            return;
          }
          await this.handleAwaitingChallenge(
            payloadValidation.value,
            message.messageId
          );
        }
        break;
      case "VALIDATED":
        {
          logger.debug("Not supposed to be here");
        }
        break;
      default:
    }
  }

  private challengeFailed(
    m: InferType<typeof messageSignatureSchema>,
    messageId: string
  ) {
    logger.trace({
      className: "NodeValidationEngine",
      method: "challengeFailed",
      messageId,
    });
    sendChallengeFailed(
      this.ws,
      m.message.toString("base64"),
      this.nodeId,
      m.signature.toString("base64"),
      messageId
    );
    logger.debug("Challenge failed. Closing connection");
    this.ws.close();
  }

  // This variable exists to avoid race conditions
  private respondingToChallenge: boolean = false;

  private async handleChallengeResponse(
    m: InferType<typeof messageSignatureSchema>,
    messageId: string
  ) {
    logger.trace({
      className: "NodeValidationMachine",
      messageId,
    });
    if (!this.respondingToChallenge) {
      logger.trace("Setting responding to challenge to true, as a lock");
      // NOTE: this could have been a state in the `nodeState` field
      this.respondingToChallenge = true;
    } else {
      logger.trace(
        "Already have a challenge response. Not going to process any further"
      );
      return sendAlreadyHaveChallengeResponse(this.ws, messageId);
    }
    if (m.message.compare(this.challenge) !== 0) {
      logger.debug(
        "The message received from the challenge does not match what was given out for the challenge"
      );
      return this.challengeFailed(m, messageId);
    }
    const key = await this.ecdsaKey;
    if (!(await verify(m.message, m.signature, key))) {
      return this.challengeFailed(m, messageId);
    }

    this.nodeState = { type: "VALIDATED" };
  }

  private async handleAwaitingChallenge(
    message: InferType<typeof awaitingResponseSchema>,
    messageId: string
  ) {
    switch (message.type) {
      case "CHALLENGE_RESPONSE":
        await this.handleChallengeResponse(message.data, messageId);
        break;
      default:
        sendFatalErrorWithMessageId(
          this.ws,
          [
            {
              title: "Not implemented message type handler",
              detail: `The message type handler "${message.type}" is yet to be implemented`,
            },
          ],
          messageId
        );
    }
  }
}
