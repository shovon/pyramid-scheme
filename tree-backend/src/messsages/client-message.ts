import { any, exact, object, chain, predicate, string } from "../validator";
import { json } from "../validators/json";
import { base64Buffer } from "../validators/base64-buffer";

export const messageSignatureSchema = object({
  message: base64Buffer(),
  signature: predicate(base64Buffer(), (buf) => buf.byteLength === 64),
});

export const challengeResponseSchema = object({
  type: exact("CHALLENGE_RESPONSE"),
  data: messageSignatureSchema,
});

export const awaitingResponseSchema = challengeResponseSchema;

export const clientMessageSchema = chain(
  json(),
  object({
    payload: any(),
    messageId: string(),
  })
);
