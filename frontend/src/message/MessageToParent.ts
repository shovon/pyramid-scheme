import * as Joi from "joi";
import {
  MessageToNodePayload,
  messageToNodePayloadSchema,
} from "./MessageToNodePayload";

export type MessageToParentEventType = "MESSAGE_TO_PARENT";
export const messageToParentEventType: MessageToParentEventType =
  "MESSAGE_TO_PARENT";

export type MessageToParent = {
  type: MessageToParentEventType;
  data: MessageToNodePayload;
};

export const messageToParentSchema = Joi.object({
  type: Joi.string().valid(messageToParentEventType).required(),
  data: messageToNodePayloadSchema,
});
