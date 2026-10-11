/*
 * A sign-in pass from Proairetos to another app of the family, for phones where each Home Screen app keeps its
 * own storage. The pass holds a one-time sign-in (a token the server made for this person, no email sent) and
 * the data key sealed with a random key. The random key waits on the server for two minutes and is given only
 * to the same person once signed in, so the pass alone, without that sign-in, does not open the data.
 */

const PREFIX = 'proairetos-pass:';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Pass = { id: string; tokenHash: string; sealedKey: string };

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const label = (id: string) => new TextEncoder().encode(`proairetos-handoff:${id}`);

export function makePass(pass: Pass): string {
  const json = JSON.stringify({ v: 1, i: pass.id, t: pass.tokenHash, k: pass.sealedKey });
  return PREFIX + btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The pass in some pasted text, or undefined when it is not one. */
export function readPass(text: string): Pass | undefined {
  const at = text.indexOf(PREFIX);
  if (at < 0) return undefined;
  const body = text.slice(at + PREFIX.length).trim().split(/\s/)[0].replace(/-/g, '+').replace(/_/g, '/');
  try {
    const value = JSON.parse(atob(body + '='.repeat((4 - (body.length % 4)) % 4))) as { v?: number; i?: string; t?: string; k?: string };
    if (value.v !== 1 || !value.i || !UUID.test(value.i) || !value.t || value.t.length > 200 || !value.k || value.k.length > 400) return undefined;
    return { id: value.i, tokenHash: value.t, sealedKey: value.k };
  } catch {
    return undefined;
  }
}

/** Seals an exportable data key for a pass: the sealed key goes in the pass, the wrap key to the server. */
export async function sealKeyForPass(key: CryptoKey, id: string): Promise<{ sealedKey: string; wrapKey: string }> {
  const wrapBytes = crypto.getRandomValues(new Uint8Array(32));
  const wrap = await crypto.subtle.importKey('raw', wrapBytes, 'AES-GCM', false, ['encrypt']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: label(id) }, wrap, raw));
  raw.fill(0);
  const all = new Uint8Array(iv.length + sealed.length);
  all.set(iv);
  all.set(sealed, iv.length);
  return { sealedKey: toB64(all), wrapKey: toB64(wrapBytes) };
}

/** Opens the data key from a pass with the wrap key from the server; the key kept is not exportable. */
export async function openKeyFromPass(sealedKey: string, wrapKey: string, id: string): Promise<CryptoKey> {
  const wrap = await crypto.subtle.importKey('raw', fromB64(wrapKey), 'AES-GCM', false, ['decrypt']);
  const bytes = fromB64(sealedKey);
  const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: label(id) }, wrap, bytes.slice(12)));
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  raw.fill(0);
  return key;
}
