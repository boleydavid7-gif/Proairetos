import { useEffect, type ReactNode } from 'react';
import LockedScreen from './LockedScreen';
import { security } from './securityService';
import { useSecurity } from './useSecurity';

const page = { display: 'grid', gap: 16, maxWidth: '28rem', margin: '18vh auto 0', padding: '0 24px', color: 'inherit' } as const;
const button = { minHeight: 48, padding: '0 20px', borderRadius: 999, font: 'inherit', cursor: 'pointer', border: 0, background: '#c9a274', color: '#14110d', fontWeight: 600, justifySelf: 'start' } as const;

/**
 * Every app mounts inside this (through the shared error boundary). It renders the app only once the stored copies of the
 * vault have been read in both places and either there is none or it is open: never while that is still being checked, and
 * never when storage could not be read to tell (it fails closed). With a vault it shows the locked screen, in every app, so
 * no app can be opened around the lock by its own address.
 */
export default function SecurityGate({ children }: { children: ReactNode }) {
  const status = useSecurity();
  useEffect(() => {
    // Always listening, so a vault made in another page reaches this one; reading what is stored makes nothing when there is none.
    void security.start();
  }, []);
  // Not yet known whether there is a vault: nothing private is shown (usually a few milliseconds).
  if (status.phase === 'checking') return null;
  if (status.phase === 'unverified') {
    return (
      <main className="locked-screen" role="alert" style={page}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif, var(--serif, Georgia, serif))', fontWeight: 500 }}>The security data on this device cannot be checked</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>Nothing has been changed or removed.</p>
        <button type="button" style={button} onClick={() => void security.retry()}>
          Try again
        </button>
      </main>
    );
  }
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
