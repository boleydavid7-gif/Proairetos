import { deleteCaptureInbox, deleteInboxItems, fetchInboxItems, saveCaptureInbox } from '../../data/sync/supabase';
import { currentUserId, syncStatus } from '../sync/syncController';

/*
 * Capture from anywhere. This device makes a key pair; the server gets only the public half and the hash of a token.
 * A Shortcut sends words with the token to /api/capture, where they are sealed with the public key; here they are
 * opened with the private key and become captures, and the sealed copies are deleted. The private key and the token
 * stay on this device (out of backups and sync).
 */

const KEY = 'proairetos.captureInbox';
type Kept = { token: string; privateJwk: JsonWebKey };

export const CAPTURE_ADDRESS = `${typeof location === 'undefined' ? 'https://proairetos.com' : location.origin}/api/capture`;

export function inboxHere(): Kept | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Kept) : undefined;
  } catch {
    return undefined;
  }
}

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Makes the inbox (or a new token and key for it). Signed in only. */
export async function turnOnInbox(): Promise<Kept> {
  const userId = currentUserId();
  if (!userId || syncStatus.get().phase !== 'ready') throw new Error('Sign in and open your data first, in Account and sync.');
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  )) as CryptoKeyPair;
  const token = randomToken();
  const tokenHash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  await saveCaptureInbox(userId, tokenHash, publicJwk);
  const kept = { token, privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey) };
  localStorage.setItem(KEY, JSON.stringify(kept));
  return kept;
}

export async function turnOffInbox(): Promise<void> {
  const userId = currentUserId();
  if (userId) await deleteCaptureInbox(userId);
  localStorage.removeItem(KEY);
}

const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/** Opens one sealed capture (the Worker's `sealForInbox`). */
export async function openSealed<T = { t: string; at: string }>(privateJwk: JsonWebKey, sealed: string, purpose = 'proairetos-capture'): Promise<T> {
  const { k, iv, c } = JSON.parse(atob(sealed)) as { k: string; iv: string; c: string };
  const privateKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, bytes(k));
  const aes = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv), additionalData: new TextEncoder().encode(purpose) }, aes, bytes(c));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

let opening: Promise<string[]> | null = null;

/** What arrived since last time, as text, oldest first; the sealed copies are deleted once read. */
export function emptyInbox(keep: (text: string) => Promise<unknown>): Promise<string[]> {
  const kept = inboxHere();
  if (!kept || syncStatus.get().phase !== 'ready') return Promise.resolve([]);
  opening ??= (async () => {
    try {
      const items = await fetchInboxItems();
      const done: string[] = [];
      const texts: string[] = [];
      for (const item of items) {
        try {
          const words = await openSealed(kept.privateJwk, item.sealed);
          await keep(words.t);
          texts.push(words.t);
          done.push(item.id);
        } catch {
          // Sealed for another device's key (the inbox was made again there): left for that device to read.
        }
      }
      await deleteInboxItems(done);
      return texts;
    } finally {
      opening = null;
    }
  })();
  return opening;
}
