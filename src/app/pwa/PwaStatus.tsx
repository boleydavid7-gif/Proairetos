import { useEffect, useSyncExternalStore } from 'react';
import { requestPersistentStorage } from './persistence';

const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};
const online = () => typeof navigator === 'undefined' || navigator.onLine;

export default function PwaStatus() {
  const connected = useSyncExternalStore(subscribe, online, () => true);
  useEffect(() => { void requestPersistentStorage(); }, []);
  if (connected) return null;
  return <div className="pwa-offline" role="status"><span className="pwa-offline__dot" aria-hidden="true" />Offline · changes stay on this device</div>;
}
