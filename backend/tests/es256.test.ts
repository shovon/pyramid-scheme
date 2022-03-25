import {
  generateKeyPair,
  importJwkPrivateKey,
  importRawNistEcPublicKey,
  sign,
  verify,
} from "../es256";
import { strict as assert } from "assert";

const privateKey = {
  crv: "P-256",
  d: "1UjR0Pr8gvTV_MOdaR7MIxeoBALdu8lTprvInPs2gdM",
  ext: true,
  key_ops: ["sign"],
  kty: "EC",
  x: "jupWemlfCemmmn7z63lTMxEDHZ1O-AsWZJw_tyoE9Eg",
  y: "dpPKhycD4arNsF5xgP0a9BbLQy4iBO9i7-NsU5rAxtE",
};

const x = Buffer.from(privateKey.x, "base64");
const y = Buffer.from(privateKey.y, "base64");

const pubKey = Buffer.concat([Buffer.from([0x04]), x, y]);

(async () => {
  const cryptoPublKey = await importRawNistEcPublicKey(pubKey);
  const cryptoPrivKey = await importJwkPrivateKey(privateKey);

  const message = Buffer.from("Hello, World!", "utf8");
  const signature = await sign(message.buffer, cryptoPrivKey);

  assert(verify(message, signature, cryptoPublKey));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
