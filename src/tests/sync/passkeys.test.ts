import { describe, expect, it } from 'vitest';
import { checkAssertion, derToRaw, toBase64Url } from '../../../supabase/functions/_shared/webauthn';
import { createKeys, unlockWithPasskey, unlockWithPassphrase, wrapWithPasskey } from '../../data/sync/keys';
import { deviceLabel } from '../../data/sync/passkeys';

const enc = new TextEncoder();

/** Web Crypto signs ECDSA as r||s; an authenticator sends DER. */
function rawToDer(raw: Uint8Array): Uint8Array {
  const part = (bytes: Uint8Array) => {
    let at = 0;
    while (at < bytes.length - 1 && bytes[at] === 0) at += 1;
    let value = bytes.slice(at);
    if (value[0] & 0x80) value = Uint8Array.from([0, ...value]);
    return Uint8Array.from([0x02, value.length, ...value]);
  };
  const body = Uint8Array.from([...part(raw.slice(0, 32)), ...part(raw.slice(32))]);
  return Uint8Array.from([0x30, body.length, ...body]);
}

async function authData(rpId: string, flags: number): Promise<Uint8Array> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(rpId)));
  return Uint8Array.from([...hash, flags, 0, 0, 0, 0]);
}

async function signed(
  keys: CryptoKeyPair,
  { challenge = 'abc', origin = 'https://proairetos.com', rpId = 'proairetos.com', flags = 0x05, type = 'webauthn.get', rsa = false } = {},
) {
  const clientData = enc.encode(JSON.stringify({ type, challenge, origin }));
  const auth = await authData(rpId, flags);
  const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientData));
  const message = Uint8Array.from([...auth, ...clientHash]);
  const signature = rsa
    ? new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, message))
    : rawToDer(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, message)));
  return { clientDataJSON: toBase64Url(clientData), authenticatorData: toBase64Url(auth), signature: toBase64Url(signature) };
}

const ecKeys = () => crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;
const spki = async (keys: CryptoKeyPair) => toBase64Url(new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey)));

describe('passkey assertions', () => {
  it('accepts a signature for the challenge, from the site, with the person verified', async () => {
    const keys = await ecKeys();
    const passkey = { publicKey: await spki(keys), algorithm: -7, rpId: 'proairetos.com' };
    expect(await checkAssertion(await signed(keys), passkey, 'abc')).toBe('');
  });

  it('refuses another challenge, another site, an unverified person, or a changed signature', async () => {
    const keys = await ecKeys();
    const passkey = { publicKey: await spki(keys), algorithm: -7, rpId: 'proairetos.com' };
    expect(await checkAssertion(await signed(keys), passkey, 'other')).toBe('challenge');
    expect(await checkAssertion(await signed(keys, { origin: 'https://evil.example' }), passkey, 'abc')).toBe('origin');
    expect(await checkAssertion(await signed(keys, { origin: 'http://proairetos.com' }), passkey, 'abc')).toBe('origin');
    expect(await checkAssertion(await signed(keys, { rpId: 'evil.example' }), passkey, 'abc')).toBe('site');
    expect(await checkAssertion(await signed(keys, { flags: 0x01 }), passkey, 'abc')).toBe('not verified');
    expect(await checkAssertion(await signed(keys, { type: 'webauthn.create' }), passkey, 'abc')).toBe('type');
    const other = { ...passkey, publicKey: await spki(await ecKeys()) };
    expect(await checkAssertion(await signed(keys), other, 'abc')).toBe('signature');
  });

  it('accepts RS256 passkeys (Windows Hello)', async () => {
    const keys = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const passkey = { publicKey: await spki(keys), algorithm: -257, rpId: 'proairetos.com' };
    expect(await checkAssertion(await signed(keys, { rsa: true }), passkey, 'abc')).toBe('');
  });

  it('reads DER signatures with short and padded parts', () => {
    const raw = new Uint8Array(64).map((_, i) => (i === 0 ? 0 : i === 32 ? 0x90 : i));
    expect([...derToRaw(rawToDer(raw))]).toEqual([...raw]);
  });
});

describe('the data key under a passkey', () => {
  it('opens with the same secret, and not with another', async () => {
    const setup = await createKeys('correct horse battery staple');
    const exportable = await unlockWithPassphrase(setup.passphraseWrap, 'correct horse battery staple', true);
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const wrap = await wrapWithPasskey(exportable, secret);
    expect(wrap.method).toBe('passkey');
    const opened = await unlockWithPasskey(wrap, secret, true);
    expect(new Uint8Array(await crypto.subtle.exportKey('raw', opened))).toEqual(new Uint8Array(await crypto.subtle.exportKey('raw', exportable)));
    await expect(unlockWithPasskey(wrap, crypto.getRandomValues(new Uint8Array(32)))).rejects.toThrow(/passkey/);
  });

  it('names the device that made it', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('iPhone');
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14)')).toBe('Android');
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
  });
});
