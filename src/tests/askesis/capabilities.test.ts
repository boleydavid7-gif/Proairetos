import { resolveCapabilities, type NativeBridgeHandshake } from '../../askesis/app/capabilities';

describe('Askesis device capabilities', () => {
  it('keeps the browser experience available without any phone bridge', () => {
    const capabilities = resolveCapabilities('web', undefined, true);
    expect(capabilities).toMatchObject({
      platform: 'web',
      bridgeStatus: 'web',
      provider: 'web',
      foregroundGps: true,
      manualHeartRate: true,
      watchFileImport: true,
      guidedSessions: true,
      healthWorkouts: false,
      healthHeartRate: false,
      backgroundGps: false,
      haptics: false,
      lockScreenControls: false,
      watchSync: false,
    });
  });

  it('enables only the native capabilities explicitly advertised by a matching bridge', () => {
    const handshake: NativeBridgeHandshake = {
      protocolVersion: 1,
      platform: 'ios',
      capabilities: {
        healthWorkouts: true,
        heartRate: true,
        backgroundGps: true,
        haptics: false,
        lockScreenControls: true,
        watchSync: false,
      },
    };
    expect(resolveCapabilities('ios', handshake, true)).toMatchObject({
      platform: 'ios',
      bridgeStatus: 'connected',
      provider: 'native',
      foregroundGps: true,
      healthWorkouts: true,
      healthHeartRate: true,
      backgroundGps: true,
      haptics: false,
      lockScreenControls: true,
      watchSync: false,
      manualHeartRate: true,
      watchFileImport: true,
    });
  });

  it('detects the Phase 7A bridge without claiming any native feature is implemented', () => {
    const handshake: NativeBridgeHandshake = {
      protocolVersion: 1,
      platform: 'ios',
      capabilities: {},
    };
    expect(resolveCapabilities('ios', handshake, true)).toMatchObject({
      bridgeStatus: 'connected',
      provider: 'native',
      healthWorkouts: false,
      healthHeartRate: false,
      backgroundGps: false,
      haptics: false,
      lockScreenControls: false,
      watchSync: false,
      manualHeartRate: true,
      watchFileImport: true,
    });
  });

  it('falls back to web capabilities when the bridge protocol or platform does not match', () => {
    const handshake: NativeBridgeHandshake = {
      protocolVersion: 2,
      platform: 'android',
      capabilities: { healthWorkouts: true, backgroundGps: true },
    };
    const capabilities = resolveCapabilities('ios', handshake, false);
    expect(capabilities.bridgeStatus).toBe('incompatible');
    expect(capabilities.provider).toBe('web');
    expect(capabilities.healthWorkouts).toBe(false);
    expect(capabilities.backgroundGps).toBe(false);
    expect(capabilities.manualHeartRate).toBe(true);
    expect(capabilities.watchFileImport).toBe(true);
  });

  it('keeps web tools when a phone shell is present but its Askesis bridge is absent', () => {
    const capabilities = resolveCapabilities('android', undefined, true);
    expect(capabilities.bridgeStatus).toBe('missing');
    expect(capabilities.provider).toBe('web');
    expect(capabilities.foregroundGps).toBe(true);
    expect(capabilities.manualHeartRate).toBe(true);
    expect(capabilities.watchFileImport).toBe(true);
  });
});
