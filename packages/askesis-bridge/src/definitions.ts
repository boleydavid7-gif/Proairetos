export type AskesisBridgePlatform = 'ios' | 'android';

export type AskesisNativeCapability =
  | 'healthWorkouts'
  | 'heartRate'
  | 'backgroundGps'
  | 'haptics'
  | 'lockScreenControls'
  | 'watchSync';

/** Protocol-v1 response. A capability is support information, never proof of user permission. */
export type AskesisBridgeHandshake = {
  protocolVersion: 1;
  platform: AskesisBridgePlatform;
  capabilities: Partial<Record<AskesisNativeCapability, boolean>>;
};

export interface AskesisBridgePlugin {
  getCapabilities(): Promise<AskesisBridgeHandshake>;
}
