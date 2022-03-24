// ECDSA, p-256 curve

import * as crypto from "crypto";

/**
 * Imports the raw NIST/Elliptic-Cuve formatted (concat) key, getting a
 * WebCrypto CryptoKey
 * @param key The key to import
 * @returns A WebCrypto CryptoKey
 */
export async function importRawNistEcKey(key: ArrayBuffer) {
  return await crypto.webcrypto.subtle.importKey(
    "raw",
    key,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
}

/**
 * Verifies a signatures associated with the buffer, given teh supplied key
 * @param buffer The buffer to run the verification against
 * @param key The key to verify the signature with
 */
export async function verify(
  buffer: ArrayBuffer,
  signature: ArrayBuffer,
  publicKey: CryptoKey
): Promise<boolean> {
  return await crypto.webcrypto.subtle.verify(
    "ECDSA",
    publicKey,
    signature,
    buffer
  );
}

/**
 * Signs a buffer, using the supplied public key
 * @param buffer The buffer to run the verification against
 * @param publicKey The key to create signature with
 */
export async function sign(buffer: ArrayBuffer, publicKey: CryptoKey) {}

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
