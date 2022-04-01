import pino from "pino";

export const logger = pino({
  level: "trace",
});

logger.debug({}, "Started the logger");
