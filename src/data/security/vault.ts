/**
 * The local vault: one random key (the Local Vault Key, LVK) that seals the data kept on this device.
 *
 * Nothing here is a new password or a new way in. The LVK is sealed under the account's data key, which the person's
 * passphrase, recovery key or passkey already open (`data/sync/keys.ts`), so unlocking the vault is unlocking the account
 * key and then one AES-GCM open. The account's own wrapped keys are kept in the header beside it (they are already
 * encrypted and safe to keep), which is what makes unlocking work with no connection.
 *
 * Cipher: AES-256-GCM through Web Crypto, the same as every other sealed thing in the app: a fresh random 96-bit nonce
 * per seal and associated data that names what is sealed, so a sealed value cannot be moved elsewhere and still open.
 * Records and files are sealed with `sealRecord` and `sealBytes` from `keys.ts`; this module adds only the LVK and its header.
 *
 * No algorithm here is new. The format is versioned (`v`) so a later change can be read by a build that knows both.
 */
import { KeyError, fromBase64, toBase64, type WrappedKey } from '../sync/keys';

export const VAULT_VERSION = 1;
const IV_BYTES = 12;
const ID_BYTES = 16;
const CHECK_TEXT = 'proairetos-vault-check';

/**
 * Why the vault could not be opened: the header is not valid (`corrupt`), it does not open with this key (`cannot-open`),
 * or storage could not be read to tell whether there is one (`unverified`).
 */
export class VaultError extends Error {
  constructor(
    readonly code: 'corrupt' | 'cannot-open' | 'unverified',
    message: string,
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

/** The account's wrapped data key, as the server keeps it, kept here so the vault opens offline. Not secret: each is encrypted. */
export type AccountEnvelopes = {
  userId: string;
  passphrase: WrappedKey | null;
  recovery: WrappedKey;
  passkeys: { credentialId: string; wrap: WrappedKey }[];
};

type Sealed = { iv: string; ct: string };

export type VaultHeader = {
  v: typeof VAULT_VERSION;
  /** Names this vault; part of what every seal in the header is bound to. */
  id: string;
  createdAt: string;
  updatedAt: string;
  /** The LVK's bytes, sealed under the account's data key. */
  lvk: Sealed;
  /** A known sentence sealed under the LVK: opening it proves the right key was found. */
  check: Sealed;
  account: AccountEnvelopes;
};

const aad = (label: string, id: string) => new TextEncoder().encode(`${label}:${id}`);

async function seal(key: CryptoKey, label: string, id: string, bytes: ArrayBuffer): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(label, id) }, key, bytes));
  return { iv: toBase64(iv), ct: toBase64(ct) };
}

async function open(key: CryptoKey, label: string, id: string, sealed: Sealed): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(sealed.iv), additionalData: aad(label, id) }, key, fromBase64(sealed.ct));
}

const importLvk = (raw: ArrayBuffer) => crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

/** A new vault for this device: a fresh random LVK, sealed under the account key. The LVK handed back cannot be exported. */
export async function createVault(accountKey: CryptoKey, account: AccountEnvelopes, now = new Date()): Promise<{ header: VaultHeader; lvk: CryptoKey }> {
  const id = toBase64(crypto.getRandomValues(new Uint8Array(ID_BYTES)));
  const raw = await crypto.subtle.exportKey('raw', await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']));
  const lvk = await importLvk(raw);
  const header: VaultHeader = {
    v: VAULT_VERSION,
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lvk: await seal(accountKey, 'proairetos-vault-lvk', id, raw),
    check: await seal(lvk, 'proairetos-vault-check', id, new TextEncoder().encode(CHECK_TEXT).buffer as ArrayBuffer),
    account,
  };
  new Uint8Array(raw).fill(0);
  return { header, lvk };
}

/** Whether a key is this vault's LVK. */
export async function isVaultKey(header: VaultHeader, key: CryptoKey): Promise<boolean> {
  try {
    return new TextDecoder().decode(await open(key, 'proairetos-vault-check', header.id, header.check)) === CHECK_TEXT;
  } catch {
    return false;
  }
}

/** Opens the LVK with the account key. */
export async function openVault(header: VaultHeader, accountKey: CryptoKey): Promise<CryptoKey> {
  let lvk: CryptoKey;
  try {
    lvk = await importLvk(await open(accountKey, 'proairetos-vault-lvk', header.id, header.lvk));
  } catch {
    throw new VaultError('cannot-open', 'The data on this device does not open with that key.');
  }
  if (!(await isVaultKey(header, lvk))) throw new VaultError('corrupt', 'The security data on this device could not be read.');
  return lvk;
}

/** The same vault with newer copies of the account's wrapped keys (a new passphrase, a new passkey). Nothing sealed changes. */
export function withAccount(header: VaultHeader, account: AccountEnvelopes, now = new Date()): VaultHeader {
  return { ...header, account, updatedAt: now.toISOString() };
}

// ---------- Reading what was stored ----------

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 20_000;

function isBase64(value: unknown, bytes?: number): value is string {
  if (!isText(value) || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return false;
  return bytes === undefined || fromBase64(value).length === bytes;
}

const isSealed = (value: unknown): value is Sealed => isRecord(value) && isBase64(value.iv, IV_BYTES) && isBase64(value.ct) && fromBase64(value.ct as string).length >= 16;

function isWrapped(value: unknown): value is WrappedKey {
  return (
    isRecord(value) &&
    (value.method === 'passphrase' || value.method === 'recovery' || value.method === 'passkey') &&
    isBase64(value.salt) &&
    isBase64(value.iv, IV_BYTES) &&
    isBase64(value.wrapped) &&
    (value.iterations === undefined || (typeof value.iterations === 'number' && Number.isInteger(value.iterations) && value.iterations > 0))
  );
}

function isAccount(value: unknown): value is AccountEnvelopes {
  return (
    isRecord(value) &&
    isText(value.userId) &&
    (value.passphrase === null || isWrapped(value.passphrase)) &&
    isWrapped(value.recovery) &&
    Array.isArray(value.passkeys) &&
    value.passkeys.every((row) => isRecord(row) && isText(row.credentialId) && isWrapped(row.wrap))
  );
}

/** Checks a stored header's shape; anything else is `corrupt`. It does not open anything. */
export function parseHeader(text: string | null | undefined): VaultHeader {
  let value: unknown;
  try {
    value = JSON.parse(text ?? '');
  } catch {
    throw new VaultError('corrupt', 'The security data on this device could not be read.');
  }
  if (
    !isRecord(value) ||
    value.v !== VAULT_VERSION ||
    !isBase64(value.id, ID_BYTES) ||
    !isText(value.createdAt) ||
    !isText(value.updatedAt) ||
    Number.isNaN(Date.parse(value.createdAt as string)) ||
    Number.isNaN(Date.parse(value.updatedAt as string)) ||
    !isSealed(value.lvk) ||
    !isSealed(value.check) ||
    !isAccount(value.account)
  ) {
    throw new VaultError('corrupt', 'The security data on this device could not be read.');
  }
  return value as unknown as VaultHeader;
}

export { KeyError };
