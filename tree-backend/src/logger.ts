import pino from "pino";

export const logger = pino({
  level: "trace",
});

logger.trace("Started the logger");
