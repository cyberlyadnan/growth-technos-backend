/**
 * Agency credentials vault — AES-256-GCM via Node.js crypto (no custom cryptography).
 *
 * Key material must live only in environment / KMS — never in MongoDB or source.
 *
 * Rotation approach:
 * 1. Add a new version entry to AGENCY_VAULT_KEYS_JSON (keep old versions).
 * 2. Set AGENCY_VAULT_ACTIVE_KEY_VERSION to the new version.
 * 3. New writes use the active version; reads decrypt with the ciphertext's keyVersion.
 * 4. Optionally re-encrypt existing credentials via POST /agency/credentials/:id/rewrap
 *    (requires ASSETS_REVEAL + password reauthentication).
 * 5. After all records are rewrapped, remove retired key versions from the env map.
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';
import { BadRequestError, AppError, ErrorCode } from '@core/errors';

/** Read live from process.env so key rotation / tests work without process restart. */
function activeKeyVersion(): string {
  return (process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION ?? '').trim();
}

function keysJson(): string {
  return (process.env.AGENCY_VAULT_KEYS_JSON ?? '').trim();
}

export const VAULT_ALGORITHM = 'aes-256-gcm' as const;
export const VAULT_IV_BYTES = 12;
export const VAULT_KEY_BYTES = 32;

export type VaultCipherBundle = {
  algorithm: typeof VAULT_ALGORITHM;
  keyVersion: string;
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
};

function parseKeyMap(): Record<string, Buffer> {
  const raw = keysJson();
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(
      'AGENCY_VAULT_KEYS_JSON is not valid JSON',
      500,
      ErrorCode.INTERNAL_ERROR,
      [],
      false,
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AppError(
      'AGENCY_VAULT_KEYS_JSON must be an object of version → hex key',
      500,
      ErrorCode.INTERNAL_ERROR,
      [],
      false,
    );
  }

  const map: Record<string, Buffer> = {};
  for (const [version, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string') {
      throw new AppError(
        `Vault key version ${version} must be a hex string`,
        500,
        ErrorCode.INTERNAL_ERROR,
        [],
        false,
      );
    }
    const hex = value.trim().replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== VAULT_KEY_BYTES * 2) {
      throw new AppError(
        `Vault key version ${version} must be ${VAULT_KEY_BYTES * 2} hex characters (32 bytes)`,
        500,
        ErrorCode.INTERNAL_ERROR,
        [],
        false,
      );
    }
    map[version] = Buffer.from(hex, 'hex');
  }
  return map;
}

let cachedKeys: Record<string, Buffer> | null = null;

function getKeyMap(): Record<string, Buffer> {
  if (!cachedKeys) cachedKeys = parseKeyMap();
  return cachedKeys;
}

/** Test helper — clear cached key map after mutating process.env */
export function resetVaultKeyCache(): void {
  cachedKeys = null;
}

export function isVaultConfigured(): boolean {
  try {
    const version = activeKeyVersion();
    if (!version) return false;
    const keys = getKeyMap();
    return Boolean(keys[version]);
  } catch {
    return false;
  }
}

export function assertVaultConfigured(): void {
  if (!isVaultConfigured()) {
    throw new BadRequestError(
      'Credentials vault is not configured. Set AGENCY_VAULT_ACTIVE_KEY_VERSION and AGENCY_VAULT_KEYS_JSON. Plaintext storage is not permitted.',
    );
  }
}

function getActiveKey(): { version: string; key: Buffer } {
  assertVaultConfigured();
  const version = activeKeyVersion();
  const key = getKeyMap()[version];
  if (!key) {
    throw new BadRequestError(`Active vault key version "${version}" is missing from AGENCY_VAULT_KEYS_JSON`);
  }
  return { version, key };
}

function getKeyByVersion(version: string): Buffer {
  const key = getKeyMap()[version];
  if (!key) {
    throw new BadRequestError(
      `Vault key version "${version}" is unavailable. Restore the key or rewrap credentials.`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): VaultCipherBundle {
  if (!plaintext) throw new BadRequestError('Secret value is required');
  const { version, key } = getActiveKey();
  const iv = randomBytes(VAULT_IV_BYTES);
  const cipher = createCipheriv(VAULT_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    algorithm: VAULT_ALGORITHM,
    keyVersion: version,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptSecret(bundle: VaultCipherBundle): string {
  if (bundle.algorithm !== VAULT_ALGORITHM) {
    throw new BadRequestError('Unsupported vault algorithm');
  }
  const key = getKeyByVersion(bundle.keyVersion);
  const decipher = createDecipheriv(
    VAULT_ALGORITHM,
    key,
    Buffer.from(bundle.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(bundle.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(bundle.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** Re-encrypt under the currently active key version. */
export function rewrapSecret(bundle: VaultCipherBundle): VaultCipherBundle {
  const plaintext = decryptSecret(bundle);
  return encryptSecret(plaintext);
}

export function maskSecret(plaintext: string, visibleTail = 4): string {
  if (!plaintext) return '••••';
  if (plaintext.length <= visibleTail) return '•'.repeat(Math.max(4, plaintext.length));
  return `${'•'.repeat(8)}${plaintext.slice(-visibleTail)}`;
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
