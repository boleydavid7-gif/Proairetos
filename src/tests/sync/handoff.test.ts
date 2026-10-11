import { describe, expect, it } from 'vitest';
import { makePass, openKeyFromPass, readPass, sealKeyForPass } from '../../data/sync/handoff';

const id = '3f2b8c1e-9d4a-4f6b-8e2c-1a2b3c4d5e6f';

describe('sign-in passes', () => {
  it('round-trips through the clipboard text, even with words around it', () => {
    const text = makePass({ id, tokenHash: 'abc123', sealedKey: 'c2VhbGVk' });
    expect(readPass(text)).toEqual({ id, tokenHash: 'abc123', sealedKey: 'c2VhbGVk' });
    expect(readPass(`Here: ${text}\n`)).toEqual({ id, tokenHash: 'abc123', sealedKey: 'c2VhbGVk' });
  });

  it('ignores anything that is not a pass', () => {
    expect(readPass('hello')).toBeUndefined();
    expect(readPass('proairetos-pass:not-base64!!')).toBeUndefined();
    expect(readPass(makePass({ id: 'not-a-uuid', tokenHash: 'a', sealedKey: 'b' }))).toBeUndefined();
  });

  it('carries the data key sealed, opened only with the server’s wrap key and the same pass', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const { sealedKey, wrapKey } = await sealKeyForPass(key, id);
    const opened = await openKeyFromPass(sealedKey, wrapKey, id);
    expect(opened.extractable).toBe(false);

    const iv = new Uint8Array(12);
    const message = new TextEncoder().encode('a reflection');
    const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, message);
    expect(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, opened, sealed))).toBe('a reflection');

    const other = await sealKeyForPass(key, id);
    await expect(openKeyFromPass(sealedKey, other.wrapKey, id)).rejects.toThrow();
    await expect(openKeyFromPass(sealedKey, wrapKey, '00000000-0000-4000-8000-000000000000')).rejects.toThrow();
  });
});
