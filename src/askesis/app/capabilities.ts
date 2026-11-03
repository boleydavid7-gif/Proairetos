import { nativePlatform } from '../../app/native/platform';

export type PhonePlatform = 'ios' | 'android';
export type NativeCapability =
  | 'healthWorkouts'
  | 'heartRate'
  | 'backgroundGps'
  | 'haptics'
  | 'lockScreenControls'
  | 'watchSync';

export type NativeBridgeHandshake = {
  protocolVersion: number;
  platform: PhonePlatform;
  capabilities: Partial<Record<NativeCapability, boolean>>;
};

export type AskesisCapabilities = {
  platform: 'web' | PhonePlatform;
  bridgeStatus: 'web' | 'missing' | 'connected' | 'incompatible';
  provider: 'web' | 'native';
  /** Browser geolocation remains the foreground fallback, including inside a phone webview. */
  foregroundGps: boolean;
  /** Manual heart-rate entry and GPX/TCX import remain available without a bridge. */
  manualHeartRate: true;
  watchFileImport: true;
  guidedSessions: true;
  healthWorkouts: boolean;
  healthHeartRate: boolean;
  backgroundGps: boolean;
  haptics: boolean;
  lockScreenControls: boolean;
  watchSync: boolean;
};

const PROTOCOL_VERSION = 1;

type NativeBridgePlugin = {
  getCapabilities(): Promise<NativeBridgeHandshake>;
};

/** Pure resolver: a native feature is enabled only when the installed bridge advertises it explicitly. */
export function resolveCapabilities(
  platform: 'web' | PhonePlatform,
  handshake: NativeBridgeHandshake | undefined,
  foregroundGps: boolean,
): AskesisCapabilities {
  const web = {
    platform,
    bridgeStatus: platform === 'web' ? 'web' as const : 'missing' as const,
    provider: 'web' as const,
    foregroundGps,
    manualHeartRate: true as const,
    watchFileImport: true as const,
    guidedSessions: true as const,
    healthWorkouts: false,
    healthHeartRate: false,
    backgroundGps: false,
    haptics: false,
    lockScreenControls: false,
    watchSync: false,
  };

  if (platform === 'web' || !handshake) return web;
  if (handshake.protocolVersion !== PROTOCOL_VERSION || handshake.platform !== platform) {
    return { ...web, bridgeStatus: 'incompatible' };
  }

  const capabilities = handshake.capabilities ?? {};
  return {
    ...web,
    bridgeStatus: 'connected',
    provider: 'native',
    healthWorkouts: capabilities.healthWorkouts === true,
    healthHeartRate: capabilities.heartRate === true,
    backgroundGps: capabilities.backgroundGps === true,
    haptics: capabilities.haptics === true,
    lockScreenControls: capabilities.lockScreenControls === true,
    watchSync: capabilities.watchSync === true,
  };
}

function browserGps(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

async function detect(): Promise<AskesisCapabilities> {
  const platform = nativePlatform();
  if (platform === 'web') return resolveCapabilities('web', undefined, browserGps());

  try {
    // Native code is loaded only inside the optional Capacitor shell. The website never imports Capacitor.
    const { registerPlugin } = await import('@capacitor/core');
    const bridge = registerPlugin<NativeBridgePlugin>('AskesisBridge');
    const handshake = await bridge.getCapabilities();
    return resolveCapabilities(platform, handshake, browserGps());
  } catch {
    // The phone shell may be installed without the Askesis bridge. Web features remain the fallback.
    return resolveCapabilities(platform, undefined, browserGps());
  }
}

let cached: Promise<AskesisCapabilities> | undefined;

/** Discovers optional device features once; pass refresh=true after installing or updating a phone bridge. */
export function askesisCapabilities(refresh = false): Promise<AskesisCapabilities> {
  if (refresh || !cached) cached = detect();
  return cached;
}
