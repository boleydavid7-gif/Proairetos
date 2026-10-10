/**
 * End-to-end encryption keys.
 *
 * A random 256-bit data key encrypts every synced record on the device.
 * The server only ever stores that key "wrapped" (encrypted) twice:
 *   - with a key derived from the person's passphrase (PBKDF2-SHA256), and
 *   - with a random recovery key the person writes down once.
 * Either unwraps it on a new device. Without both, the data cannot be read,
 * by the server or by anyone else.
 */

const PBKDF2_ITERATIONS = 600_000;
const RECOVERY_BYTES = 20; // 160 bits
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return btoa(chunks.join(''));
}
const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export interface WrappedKey {
  method: 'passphrase' | 'recovery';
  salt: string;
  iterations?: number;
  iv: string;
  wrapped: string;
}

export class KeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyError';
  }
}

function encodeRecovery(bytes: Uint8Array): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += CROCKFORD[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out.match(/.{1,4}/g)!.join('-');
}

function decodeRecovery(text: string): Uint8Array<ArrayBuffer> {
  const clean = text.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  let bits = '';
  for (const char of clean) {
    const value = CROCKFORD.indexOf(char);
    if (value < 0) throw new KeyError('That recovery key has a character that does not belong.');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(RECOVERY_BYTES);
  if (bits.length < RECOVERY_BYTES * 8) throw new KeyError('That recovery key is too short.');
  for (let i = 0; i < RECOVERY_BYTES; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return bytes;
}

async function passphraseKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

async function recoveryWrappingKey(recovery: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', recovery, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('proairetos-recovery') },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

async function wrap(dataKey: CryptoKey, wrapping: CryptoKey, method: WrappedKey['method'], salt: Uint8Array, iterations?: number): Promise<WrappedKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(await crypto.subtle.wrapKey('raw', dataKey, wrapping, { name: 'AES-GCM', iv }));
  return { method, salt: toBase64(salt), iterations, iv: toBase64(iv), wrapped: toBase64(wrapped) };
}

async function unwrap(envelope: WrappedKey, wrapping: CryptoKey): Promise<CryptoKey> {
  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      fromBase64(envelope.wrapped),
      wrapping,
      { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
      { name: 'AES-GCM', length: 256 },
      false, // usable on this device, never exportable
      ['encrypt', 'decrypt'],
    );
  } catch {
    throw new KeyError(
      envelope.method === 'passphrase' ? 'That passphrase does not unlock your data.' : 'That recovery key does not unlock your data.',
    );
  }
}

export const MIN_PASSPHRASE_LENGTH = 10;

export type KeySetup = {
  dataKey: CryptoKey;
  passphraseWrap: WrappedKey;
  recoveryWrap: WrappedKey;
  /** Shown to the person once, never stored or sent. */
  recoveryKey: string;
};

/** First device: a new data key, wrapped by the passphrase and by a fresh recovery key. */
export async function createKeys(passphrase: string): Promise<KeySetup> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new KeyError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters. A few unrelated words work well.`);
  }
  const extractable = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const passSalt = crypto.getRandomValues(new Uint8Array(16));
  const recoverySalt = crypto.getRandomValues(new Uint8Array(16));
  const recovery = crypto.getRandomValues(new Uint8Array(RECOVERY_BYTES));

  const passphraseWrap = await wrap(extractable, await passphraseKey(passphrase, passSalt, PBKDF2_ITERATIONS), 'passphrase', passSalt, PBKDF2_ITERATIONS);
  const recoveryWrap = await wrap(extractable, await recoveryWrappingKey(recovery, recoverySalt), 'recovery', recoverySalt);

  // From here on the device only holds a non-exportable copy.
  const dataKey = await unwrap(passphraseWrap, await passphraseKey(passphrase, passSalt, PBKDF2_ITERATIONS));
  return { dataKey, passphraseWrap, recoveryWrap, recoveryKey: encodeRecovery(recovery) };
}

export async function unlockWithPassphrase(envelope: WrappedKey, passphrase: string): Promise<CryptoKey> {
  return unwrap(envelope, await passphraseKey(passphrase, fromBase64(envelope.salt), envelope.iterations ?? PBKDF2_ITERATIONS));
}

export async function unlockWithRecoveryKey(envelope: WrappedKey, recoveryKey: string): Promise<CryptoKey> {
  return unwrap(envelope, await recoveryWrappingKey(decodeRecovery(recoveryKey), fromBase64(envelope.salt)));
}

export type SealedRecord = { iv: string; ciphertext: string };

/** Encrypts one record, bound to its collection and id so it cannot be swapped for another. */
export async function sealRecord(key: CryptoKey, collection: string, id: string, record: unknown): Promise<SealedRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`${collection}:${id}`) },
    key,
    new TextEncoder().encode(JSON.stringify(record)),
  );
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function openRecord<T>(key: CryptoKey, collection: string, id: string, sealed: SealedRecord): Promise<T> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv), additionalData: new TextEncoder().encode(`${collection}:${id}`) },
      key,
      fromBase64(sealed.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new KeyError(`A synced record (${collection}) could not be opened with this key.`);
  }
}

/** Encrypts a file's bytes (a photo, say), bound to its name so it cannot be swapped for another. The result is iv + ciphertext. */
export async function sealBytes(key: CryptoKey, label: string, bytes: ArrayBuffer): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(label) }, key, bytes),
  );
  const out = new Uint8Array(iv.length + ciphertext.length);
  out.set(iv, 0);
  out.set(ciphertext, iv.length);
  return out;
}

export async function openBytes(key: CryptoKey, label: string, sealed: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const all = new Uint8Array(sealed);
    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: all.slice(0, 12), additionalData: new TextEncoder().encode(label) },
      key,
      all.slice(12),
    );
  } catch {
    throw new KeyError(`A synced file (${label}) could not be opened with this key.`);
  }
}
