// secp256k1 using SHA 256

import * as crypto from "crypto";

/**
 * Imports the raw NIST/Elliptic-Cuve formatted (concat) key, getting a
 * WebCrypto CryptoKey
 * @param key The key to import
 * @returns A WebCrypto CryptoKey
 */
export async function importRawNistEcPublicKey(key: ArrayBuffer) {
  return await crypto.webcrypto.subtle.importKey(
    "raw",
    key,
    {
      name: "ECDSA",
      namedCurve: "P-256",
      hash: { name: "SHA-256" },
    },
    true,
    ["verify"]
  );
}

/**
 * Imports a JWK-encoded secp256k1 private key
 * @param key The key to import
 * @returns A Promise that holds a WebCrypto CryptoKey
 */
export async function importJwkPrivateKey(key: JsonWebKey) {
  return await crypto.webcrypto.subtle.importKey(
    "jwk",
    key,
    {
      name: "ECDSA",
      namedCurve: "P-256",
      hash: {
        name: "SHA-256",
      },
    },
    false,
    ["sign"]
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
    { name: "ECDSA", hash: { name: "SHA-256" } },
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
export async function sign(buffer: ArrayBuffer, privateKey: CryptoKey) {
  return await crypto.webcrypto.subtle.sign(
    {
      name: "ECDSA",
      hash: {
        name: "SHA-256",
      },
    },
    privateKey,
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
      hash: {
        name: "SHA-256",
      },
    },
    true,
    ["sign", "verify"]
  );
}
