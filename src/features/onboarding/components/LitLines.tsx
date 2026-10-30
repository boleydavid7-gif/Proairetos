import { useEffect, useRef, useState, type CSSProperties } from 'react';

const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
/** Long enough to read the line, then the light moves on. */
const readingTime = (line: string) => Math.min(3800, 1100 + line.length * 26);

/**
 * The owner's words lit one line at a time, as a lyrics view lights the line being sung: the line now is lit, the ones
 * read stay, a little dimmer, and the ones to come wait unseen in their places (so nothing shifts). Then every line is
 * lit together, and the finale, if any, comes in large. A tap lights them all at once.
 */
export default function LitLines({ lines, finale }: { lines: string[]; finale?: string }) {
  const [at, setAt] = useState(() => (still() ? lines.length : 0));
  const now = useRef<HTMLSpanElement>(null);
  const all = at >= lines.length;

  useEffect(() => {
    if (all) return;
    const timer = window.setTimeout(() => setAt((was) => was + 1), readingTime(lines[at]));
    return () => window.clearTimeout(timer);
  }, [all, at, lines]);

  useEffect(() => {
    if (at > 0 && !all) now.current?.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
  }, [all, at]);

  return (
    <div className="lit-lines" data-all={all || undefined} onClick={() => setAt(lines.length)}>
      <p className="lit-lines__words">
        {lines.map((line, index) => (
          <span
            key={line}
            ref={index === at ? now : undefined}
            data-state={all ? 'all' : index < at ? 'read' : index === at ? 'now' : 'next'}
            style={{ '--i': index } as CSSProperties}
          >
            {line}
          </span>
        ))}
      </p>
      {finale && (
        <p className="lit-lines__finale" data-shown={all || undefined} aria-hidden={!all}>
          {finale}
        </p>
      )}
    </div>
  );
}
