import { string, transform, chain, predicate } from "../validator";
import { Buffer } from "buffer";

export const base64Buffer = () =>
  chain(
    string(),
    transform((value) => Buffer.from(value, "base64"))
  );
