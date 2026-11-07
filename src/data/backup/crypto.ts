import { BACKUP_FORMAT, BACKUP_VERSION, BackupError, validateData, type BackupData, type EncryptedBackup } from './format';

// OWASP's current guidance for PBKDF2-HMAC-SHA256.
const ITERATIONS = 600_000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Seals backup data with a password. Without the password it cannot be read. */
export async function encryptBackup(data: BackupData, password: string, exportedAt: string): Promise<EncryptedBackup> {
  if (!password) throw new BackupError('Choose a password.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    ciphertext: toBase64(ciphertext),
  };
}

export async function decryptBackup(file: EncryptedBackup, password: string): Promise<BackupData> {
  const key = await deriveKey(password, fromBase64(file.kdf.salt), file.kdf.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.cipher.iv) }, key, fromBase64(file.ciphertext));
  } catch {
    throw new BackupError('That password does not open this backup.');
  }
  return validateData(JSON.parse(new TextDecoder().decode(plaintext)));
}
