import type { ReactNode } from 'react';
import './empty.css';

/** A list with nothing in it yet: its mark, a name, and one plain line on what goes there. */
export default function Empty({ icon, title, line, children }: { icon: ReactNode; title: string; line?: string; children?: ReactNode }) {
  return (
    <div className="list-empty">
      <span className="list-empty__mark" aria-hidden="true">{icon}</span>
      <p className="list-empty__title">{title}</p>
      {line && <p className="list-empty__line">{line}</p>}
      {children}
    </div>
  );
}
