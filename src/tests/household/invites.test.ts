import { describe, expect, it } from 'vitest';
import { sealFor } from '../../app/household/invites';
import { openSealed } from '../../app/capture/inbox';

const pair = async () =>
  (await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])) as CryptoKeyPair;

describe('household invites by email', () => {
  it('seal the household for one account: only its key opens it, and only as an invite', async () => {
    const alex = await pair();
    const eve = await pair();
    const household = { id: '0f8fad5b-d9cb-469f-a165-70867728950e', key: 'k'.repeat(43), name: 'The Smiths' };
    const sealed = await sealFor(await crypto.subtle.exportKey('jwk', alex.publicKey), { household, from: 'Sam' });
    const alexJwk = await crypto.subtle.exportKey('jwk', alex.privateKey);
    expect(await openSealed(alexJwk, sealed, 'proairetos-household-invite')).toEqual({ household, from: 'Sam' });
    await expect(openSealed(await crypto.subtle.exportKey('jwk', eve.privateKey), sealed, 'proairetos-household-invite')).rejects.toThrow();
    await expect(openSealed(alexJwk, sealed, 'proairetos-capture')).rejects.toThrow();
  });
});
