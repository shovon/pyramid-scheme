import * as Joi from "joi";

export type HiMessageEventType = "HI";
export const hiMessageEventType: HiMessageEventType = "HI";

export type HiMessage = {
  type: HiMessageEventType;
};

export const hiMessageSchema = Joi.object({
  type: Joi.string().valid(hiMessageEventType).required(),
});
