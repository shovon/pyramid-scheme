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
import { send } from "process";

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

// You can think of this as a state machine
export default class RootNodeManager {
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
    if (this._ecdsaKey) {
      return Promise.resolve(this._ecdsaKey);
    }
    return importRawNistEcPublicKey(this.publicKeyBuffer).then((key) => {
      this._ecdsaKey = key;
      return key;
    });
  }

  constructor(private ws: WebSocket, private nodeId: string) {
    // At initialization, the node state is at "PREPARING_CHALLENGE".
    //
    // This is because we are parsing the nodeId, and turning it into a key
    // that the ECDSA scheme can understand

    this.publicKeyBuffer = Buffer.from(nodeId, "base64");
    if (this.publicKeyBuffer.length !== 65) {
      sendBadKeyError(
        ws,
        {
          message: `Expected the tree ID to be a base64-encoded NIST-format 65-byte ECDSA public key, but instead got a key of length ${this.publicKeyBuffer.length}`,
          key: nodeId,
        },
        "client"
      );
      // And kill the connection
      ws.close();
      return;
    }

    this.ecdsaKey.then(
      () => {
        // Got the ECDSA key.
        //
        // Sending challenge.
        this.nodeState = { type: "AWAITING_CHALLENGE_RESPONSE" };
        sendChallenge(ws, this.challenge.toString("base64"));
      },
      (e) => {
        // Notify to the user that the key is malformed
        sendBadKeyError(
          ws,
          {
            message: "An error occurred attempting to parse the key",
            key: nodeId,
            errorObject: e,
          },
          "unsure"
        );
        // And kill the connection
        ws.close();
      }
    );

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
        }
        break;
      default:
    }
  }

  private challengeFailed(
    m: InferType<typeof messageSignatureSchema>,
    messageId: string
  ) {
    sendChallengeFailed(
      this.ws,
      m.message.toString("base64"),
      this.nodeId,
      m.signature.toString("base64"),
      messageId
    );
    this.ws.close();
  }

  private async handleChallengeResponse(
    m: InferType<typeof messageSignatureSchema>,
    messageId: string
  ) {
    if (!this.respondingToChallenge) {
      this.respondingToChallenge = true;
    } else {
      return sendAlreadyHaveChallengeResponse(this.ws, messageId);
    }
    if (m.message.compare(this.challenge) !== 0) {
      return this.challengeFailed(m, messageId);
    }
    const key = await this.ecdsaKey;
    if (!(await verify(m.message, m.signature, key))) {
      return this.challengeFailed(m, messageId);
    }
  }

  private respondingToChallenge: boolean = false;
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
