import {
  KeyError,
  createKeys,
  openRecord,
  sealRecord,
  unlockWithPassphrase,
  unlockWithRecoveryKey,
} from '../../data/sync/keys';

describe('end-to-end keys', () => {
  it('unlocks the same data key with the passphrase or the recovery key', async () => {
    const setup = await createKeys('quiet river morning');
    const sealed = await sealRecord(setup.dataKey, 'reflections', 'r1', { body: 'A private thought.' });

    const byPassphrase = await unlockWithPassphrase(setup.passphraseWrap, 'quiet river morning');
    const byRecovery = await unlockWithRecoveryKey(setup.recoveryWrap, setup.recoveryKey.toLowerCase());

    expect(await openRecord(byPassphrase, 'reflections', 'r1', sealed)).toEqual({ body: 'A private thought.' });
    expect(await openRecord(byRecovery, 'reflections', 'r1', sealed)).toEqual({ body: 'A private thought.' });
  }, 30_000);

  it('never stores the passphrase, recovery key, or plaintext in what goes to the server', async () => {
    const setup = await createKeys('quiet river morning');
    const sealed = await sealRecord(setup.dataKey, 'reflections', 'r1', { body: 'A private thought.' });
    const uploaded = JSON.stringify([setup.passphraseWrap, setup.recoveryWrap, sealed]);

    expect(uploaded).not.toContain('quiet river');
    expect(uploaded).not.toContain(setup.recoveryKey);
    expect(uploaded).not.toContain('private thought');
    expect(setup.recoveryKey).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/);
  }, 30_000);

  it('refuses a wrong passphrase or recovery key, and short passphrases', async () => {
    const setup = await createKeys('quiet river morning');
    await expect(unlockWithPassphrase(setup.passphraseWrap, 'quiet river evening')).rejects.toBeInstanceOf(KeyError);
    await expect(unlockWithRecoveryKey(setup.recoveryWrap, 'AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA')).rejects.toBeInstanceOf(KeyError);
    await expect(createKeys('short')).rejects.toBeInstanceOf(KeyError);
  }, 30_000);

  it('binds each record to its identity, so a server cannot swap records', async () => {
    const { dataKey } = await createKeys('quiet river morning');
    const sealed = await sealRecord(dataKey, 'reflections', 'r1', { body: 'x' });
    await expect(openRecord(dataKey, 'reflections', 'r2', sealed)).rejects.toBeInstanceOf(KeyError);
    await expect(openRecord(dataKey, 'decisions', 'r1', sealed)).rejects.toBeInstanceOf(KeyError);
  }, 30_000);

  it('keeps the device copy of the key non-exportable', async () => {
    const { dataKey } = await createKeys('quiet river morning');
    expect(dataKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', dataKey)).rejects.toThrow();
  }, 30_000);
});
