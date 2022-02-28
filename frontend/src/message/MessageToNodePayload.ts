import * as Joi from "joi";
import { helloMessageSchema } from "./HelloMessage";
import { hiMessageSchema } from "./HiMessage";

export type MessageToNodePayload = any;
export const messageToNodePayloadSchema = Joi.alternatives(
  hiMessageSchema,
  helloMessageSchema
);
