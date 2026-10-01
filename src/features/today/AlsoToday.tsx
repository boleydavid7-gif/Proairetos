import { useState, type ReactNode } from 'react';

export type AlsoSection = { id: string; label: string; count: number; content: ReactNode };

/**
 * Everything secondary, folded into one line of counts so Today stays
 * short. One section opens at a time.
 */
export default function AlsoToday({ sections }: { sections: AlsoSection[] }) {
  const present = sections.filter((section) => section.count > 0);
  const [openId, setOpenId] = useState<string | null>(null);
  if (present.length === 0) return null;
  const open = present.find((section) => section.id === openId);

  return (
    <section className="stack-tight also-today" aria-label="Also today">
      <div className="chip-row" role="group" aria-label="Also today">
        {present.map((section) => (
          <button
            key={section.id}
            type="button"
            className="chip"
            aria-expanded={openId === section.id}
            onClick={() => setOpenId(openId === section.id ? null : section.id)}
          >
            {section.label} <span className="also-today__count">{section.count}</span>
          </button>
        ))}
      </div>
      {open && <div className="also-today__panel">{open.content}</div>}
    </section>
  );
}
