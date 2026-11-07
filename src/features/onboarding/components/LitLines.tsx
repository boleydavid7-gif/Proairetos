import type { CSSProperties } from 'react';

/**
 * The owner's words, revealed in one smooth pass: each line rises in a moment after the one before, warmed by the
 * lamp as it arrives, and every line stays to read. The finale, if any, comes in large after the last.
 */
export default function LitLines({ lines, finale }: { lines: string[]; finale?: string }) {
  return (
    <div className="lit-lines" style={{ '--count': lines.length } as CSSProperties}>
      <p className="lit-lines__words">
        {lines.map((line, index) => (
          <span key={line} style={{ '--i': index } as CSSProperties}>
            {line}
          </span>
        ))}
      </p>
      {finale && <p className="lit-lines__finale">{finale}</p>}
    </div>
  );
}
