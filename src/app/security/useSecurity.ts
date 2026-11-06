import { useSyncExternalStore } from 'react';
import { security, type SecurityStatus } from './securityService';

/** The security state, for a screen that needs to react to it. */
export function useSecurity(): SecurityStatus {
  return useSyncExternalStore(security.subscribe, security.status);
}
