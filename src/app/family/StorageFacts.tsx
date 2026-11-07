import { useEffect, useState } from 'react';
import { keepStorage } from './dailyCopy';

/** How much this browser keeps for the family apps on this device, and whether it has agreed to keep it. */
export function useStorageFacts() {
  const [facts, setFacts] = useState<{ used?: number; kept?: boolean }>();
  useEffect(() => {
    const storage = navigator.storage;
    if (!storage?.estimate) return;
    void Promise.all([storage.estimate().catch(() => undefined), storage.persisted?.().catch(() => false) ?? Promise.resolve(false)]).then(([estimate, kept]) =>
      setFacts({ used: estimate?.usage, kept: Boolean(kept) }),
    );
  }, []);
  return facts;
}

export function sizeText(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

/** One plain line: "On this device: 42 MB for all the apps. Kept by the browser." */
export default function StorageFacts({ className = 'muted' }: { className?: string }) {
  const facts = useStorageFacts();
  const [kept, setKept] = useState<boolean>();
  if (!facts || facts.used === undefined) return null;
  const isKept = kept ?? facts.kept;
  return (
    <p className={className}>
      On this device: {sizeText(facts.used)} for all the apps.{' '}
      {isKept ? (
        'Kept by the browser.'
      ) : (
        <>
          The browser may clear it if space runs low; a backup keeps a copy.{' '}
          <button type="button" className="text-link" onClick={() => void keepStorage(true).then(setKept)}>
            Ask to keep it
          </button>
        </>
      )}
    </p>
  );
}
