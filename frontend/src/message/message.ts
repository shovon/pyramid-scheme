import * as Joi from "joi";
import { HelloMessage, helloMessageSchema } from "./HelloMessage";
import { HiMessage, hiMessageSchema } from "./HiMessage";
import { MessageToNode, messageToNodeSchema } from "./MessageToNode";
import { MessageToParent, messageToParentSchema } from "./MessageToParent";

export type Message =
  | MessageToNode
  | HiMessage
  | HelloMessage
  | MessageToParent;

export const messageSchema = Joi.alternatives(
  messageToNodeSchema,
  hiMessageSchema,
  helloMessageSchema,
  messageToParentSchema
);

export function validateMessage(value: any): Joi.ValidationError | undefined {
  const validation = messageSchema.validate(value);
  return validation.error;
}
