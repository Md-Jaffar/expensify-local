// src/utils/crypto.js — Local client-side cryptography via Web Crypto API
// Implements salted PBKDF2 for PIN protection and AES-256-GCM for backup encryption

/**
 * Generate a cryptographically secure random salt (hex string).
 */
export function generateSalt(length = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a PIN or password using PBKDF2-HMAC-SHA256 with salt and 100,000 iterations.
 * Prevents precomputed rainbow table attacks against 4-digit PINs.
 * @param {string} pin - Raw PIN/passcode string
 * @param {string} [saltHex] - Optional hex salt. If omitted, a fresh salt is generated.
 * @returns {Promise<{ hash: string, salt: string }>}
 */
export async function hashPIN(pin, saltHex = null) {
  if (!pin) return { hash: null, salt: null };

  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))
    : crypto.getRandomValues(new Uint8Array(16));

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(pin)),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const outputSalt = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash, salt: outputSalt };
}

/**
 * Verify a candidate PIN against stored hash and salt.
 * Also supports legacy unsalted SHA-256 hashes with safe upgrade detection.
 */
export async function verifyPIN(candidatePIN, storedHash, storedSalt = null) {
  if (!storedHash) return true; // Profile is not PIN protected

  if (storedSalt) {
    const { hash } = await hashPIN(candidatePIN, storedSalt);
    return hash === storedHash;
  }

  // Fallback for legacy raw SHA-256 hashes
  const encoder = new TextEncoder();
  const rawBuf = await crypto.subtle.digest('SHA-256', encoder.encode(String(candidatePIN)));
  const legacyHash = Array.from(new Uint8Array(rawBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return legacyHash === storedHash;
}

/**
 * Derive an AES-GCM CryptoKey from a user password and salt using PBKDF2.
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary JSON string with a password using AES-256-GCM.
 * Formats binary data as Base64 strings for compact, corruption-resistant serialization.
 */
export async function encryptData(plainText, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  // Convert Uint8Array to base64
  const toBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

  const bundle = {
    app: 'ExpensifyLocal',
    version: 2,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 100000,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ciphertextBuffer),
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * Decrypt a bundle previously encrypted by encryptData.
 * Authenticates ciphertext with AES-GCM tag; throws descriptive error on wrong password.
 */
export async function decryptData(encryptedBundleString, password) {
  let bundle;
  try {
    bundle = JSON.parse(encryptedBundleString);
  } catch {
    throw new Error('INVALID_FORMAT: Backup file is not valid JSON.');
  }

  const fromBase64 = (b64) =>
    new Uint8Array(
      atob(b64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

  // Handle both v2 (Base64) and legacy v1 (number array) formats
  let salt, iv, data;
  if (bundle.version === 2) {
    salt = fromBase64(bundle.salt);
    iv = fromBase64(bundle.iv);
    data = fromBase64(bundle.data);
  } else if (bundle.salt && Array.isArray(bundle.salt)) {
    salt = new Uint8Array(bundle.salt);
    iv = new Uint8Array(bundle.iv);
    data = new Uint8Array(bundle.data);
  } else {
    throw new Error('INVALID_BUNDLE: Missing cryptographic salt, IV, or ciphertext.');
  }

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('AUTH_FAILED: Incorrect backup password or tampered backup file.');
  }
}
