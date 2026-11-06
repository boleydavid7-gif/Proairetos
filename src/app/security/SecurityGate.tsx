import { useEffect, type ReactNode } from 'react';
import LockedScreen from './LockedScreen';
import { security } from './securityService';
import { useSecurity } from './useSecurity';

const page = { display: 'grid', gap: 16, maxWidth: '28rem', margin: '18vh auto 0', padding: '0 24px', color: 'inherit' } as const;

/**
 * Every app mounts inside this (through the shared error boundary). With no vault it renders its children untouched, so
 * nothing changes for anyone today. With a vault it shows the locked screen until the vault is open, in every app, so no app
 * can be opened around the lock by its own address.
 */
export default function SecurityGate({ children }: { children: ReactNode }) {
  const status = useSecurity();
  useEffect(() => {
    // Always listening, so a vault made in another page reaches this one; reading what is stored makes nothing when there is none.
    void security.start();
  }, []);
  if (status.phase === 'locked') return <LockedScreen />;
  if (status.phase === 'corrupt') {
    return (
      <main className="locked-screen" role="alert" style={page}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif, var(--serif, Georgia, serif))', fontWeight: 500 }}>The security data on this device could not be read</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>Nothing has been changed or removed.</p>
      </main>
    );
  }
  return <>{children}</>;
}
