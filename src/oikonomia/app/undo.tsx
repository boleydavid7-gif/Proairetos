import { useSyncExternalStore } from 'react';

/** One undo at a time, kept above the pages so it stays while the person moves between them. */
type Offer = { id: number; message: string; run: () => Promise<void> | void };

let current: Offer | null = null;
let timer = 0;
let counter = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

export function offerUndo(message: string, run: () => Promise<void> | void, seconds = 7): void {
  window.clearTimeout(timer);
  counter += 1;
  current = { id: counter, message, run };
  changed();
  timer = window.setTimeout(() => {
    current = null;
    changed();
  }, seconds * 1000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function UndoToast() {
  const offer = useSyncExternalStore(subscribe, () => current);
  if (!offer) return null;
  return (
    <div className="oiko-toast" role="status" key={offer.id}>
      <span>{offer.message}</span>
      <button
        type="button"
        onClick={async () => {
          window.clearTimeout(timer);
          current = null;
          changed();
          await offer.run();
        }}
      >
        Undo
      </button>
    </div>
  );
}
