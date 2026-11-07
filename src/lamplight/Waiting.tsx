import type { ReactNode } from 'react';

/**
 * Lamplight's one waiting mark: a small light that breathes beside the words saying what is happening ("Saving…").
 * Every app waits the same way; with reduced motion the light simply stays on.
 */
export function Waiting({ children }: { children: ReactNode }) {
  return (
    <span className="ll-waiting" role="status">
      <span className="ll-waiting__light" aria-hidden="true" />
      {children}
    </span>
  );
}
