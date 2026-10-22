import { openSealed } from '../../app/capture/inbox';
import { deleteTripInbox, deleteTripInboxItems, fetchTripInboxItems, saveTripInbox } from '../../data/sync/supabase';
import { currentUserId, syncStatus } from '../../app/sync/syncController';
import type { MailWords } from '../core/mail';

/*
 * Poreia's forwarding address. This device makes a key pair and a token; the server keeps the token's hash and the
 * public key. Mail sent to trips.<token>@ the site is sealed by the Worker with that key; here it is opened and the
 * sealed copies deleted. The private key and token stay on this device (`poreiaMail`, out of backups and sync).
 */

const KEY = 'poreiaMail';
export const MAIL_DOMAIN = 'proairetos.com';
type Kept = { token: string; privateJwk: JsonWebKey };

export function mailHere(): Kept | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Kept) : undefined;
  } catch {
    return undefined;
  }
}

export const addressFor = (token: string) => `trips.${token}@${MAIL_DOMAIN}`;

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** 26 letters and digits in lower case (base32), so a sender lower-casing the address changes nothing. */
function lowerToken(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  return [...crypto.getRandomValues(new Uint8Array(26))].map((byte) => alphabet[byte % 32]).join('');
}

/** Makes the address (or a new one, which retires the old). Signed in only. */
export async function turnOnMail(): Promise<Kept> {
  const userId = currentUserId();
  if (!userId || syncStatus.get().phase !== 'ready') throw new Error('Sign in and open your data first, above.');
  const pair = (await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])) as CryptoKeyPair;
  const token = lowerToken();
  const tokenHash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  await saveTripInbox(userId, tokenHash, await crypto.subtle.exportKey('jwk', pair.publicKey));
  const kept = { token, privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey) };
  localStorage.setItem(KEY, JSON.stringify(kept));
  return kept;
}

export async function turnOffMail(): Promise<void> {
  const userId = currentUserId();
  if (userId) await deleteTripInbox(userId);
  localStorage.removeItem(KEY);
}

let opening: Promise<MailWords[]> | null = null;

/** What arrived since last time, oldest first; each is handed to `keep` and its sealed copy deleted after. */
export function openMail(keep: (mail: MailWords) => void): Promise<MailWords[]> {
  const kept = mailHere();
  if (!kept || syncStatus.get().phase !== 'ready') return Promise.resolve([]);
  opening ??= (async () => {
    try {
      const items = await fetchTripInboxItems();
      const done: string[] = [];
      const mails: MailWords[] = [];
      for (const item of items) {
        try {
          const mail = await openSealed<MailWords>(kept.privateJwk, item.sealed, 'poreia-mail');
          keep(mail);
          mails.push(mail);
          done.push(item.id);
        } catch {
          // Sealed for another device's key: left for that device.
        }
      }
      await deleteTripInboxItems(done);
      return mails;
    } finally {
      opening = null;
    }
  })();
  return opening;
}
