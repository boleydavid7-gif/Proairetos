import type { ReactNode } from 'react';
import Empty from '../../app/family/Empty';
import { GLYPHS, Sym } from '../../lamplight/icons';

/**
 * Poreia's empty state: the family's lit mark with a dashed route around it, a short name, one line and the way in.
 */
export default function RouteEmpty({ glyph, title, line, children }: { glyph: keyof typeof GLYPHS; title: string; line?: string; children?: ReactNode }) {
  return (
    <div className="poreia-empty">
      <Empty icon={<Sym name={glyph} size={28} className="ll-icon--lit" />} title={title} line={line}>
        {children && <div className="poreia-empty__actions">{children}</div>}
      </Empty>
    </div>
  );
}
