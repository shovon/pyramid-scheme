import Joi from "joi";

export type HelloMessageEventType = "HELLO";
export const helloMessageEventType: HelloMessageEventType = "HELLO";

export type HelloMessage = {
  type: HelloMessageEventType;
};

export const helloMessageSchema = Joi.object({
  type: Joi.string().valid(helloMessageEventType).required(),
});
