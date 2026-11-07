import { createKeysForPasskey, sealBytes, openBytes, unlockWithRecoveryKey, unlockWithPasskey, wrapWithPasskey } from '../../data/sync/keys';

describe('an account set up with a passkey', () => {
  it('opens with the passkey and with the recovery key, and keeps no exportable key on the device', async () => {
    const setup = await createKeysForPasskey();
    const sealed = await sealBytes(setup.dataKey, 'test', new TextEncoder().encode('hello').buffer as ArrayBuffer);
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const byPasskey = await unlockWithPasskey(await wrapWithPasskey(setup.exportable, secret), secret);
    const byRecovery = await unlockWithRecoveryKey(setup.recoveryWrap, setup.recoveryKey);
    for (const key of [byPasskey, byRecovery]) expect(new TextDecoder().decode(await openBytes(key, 'test', sealed.buffer as ArrayBuffer))).toBe('hello');
    expect(setup.dataKey.extractable).toBe(false);
  });
});
