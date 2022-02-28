import * as Joi from "joi";
import {
  MessageToNodePayload,
  messageToNodePayloadSchema,
} from "./MessageToNodePayload";

export type MessageToNodeEventType = "MESSAGE_TO_NODE";
export const messageToNodeEventType: MessageToNodeEventType = "MESSAGE_TO_NODE";

export type MessageToNode = {
  type: MessageToNodeEventType;
  data: {
    to: string;
    payload: MessageToNodePayload;
  };
};

export const messageToNodeSchema = Joi.object({
  type: Joi.string().valid(messageToNodeEventType).required(),
  data: {
    to: Joi.string().required(),
    payload: messageToNodePayloadSchema,
  },
});
