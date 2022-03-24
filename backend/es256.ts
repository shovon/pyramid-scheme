import * as crypto from "crypto";

// ECDSA, p-256 curve

declare var something: Crypto;

something.subtle;

/**
 * Verifies a signatures associated with the buffer, given teh supplied key
 * @param buffer The buffer to run the verification against
 * @param key The key to verify the signature with
 */
export async function verify(
  buffer: ArrayBuffer,
  signature: ArrayBuffer,
  key: ArrayBuffer
): Promise<boolean> {
  const publicKey = await crypto.webcrypto.subtle.importKey(
    "raw",
    key,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );

  return await crypto.webcrypto.subtle.verify(
    "ECDSA",
    publicKey,
    signature,
    buffer
  );
}

/**
 * Generates a WebCrypt key-pair
 * @returns A WebCrypto key-pair
 */
export async function generateKeyPair() {
  return await crypto.webcrypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
}
