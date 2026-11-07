import type { CSSProperties } from 'react';

const STEPS = 1000;

/**
 * Where the reader is in a book, in Lamplight: a hairline rail with the lamp's light filling it up to the place,
 * a small notch where each part begins and a lit point at the place. Dragging or arrow keys move through the book.
 */
export function ReaderRail({ at, marks = [], label, valueText, onSeek }: { at: number; marks?: readonly number[]; label: string; valueText: string; onSeek: (fraction: number) => void }) {
  const place = Math.max(0, Math.min(1, at));
  return (
    <div className="theoria-rail" style={{ '--at': place } as CSSProperties}>
      <span className="theoria-rail__track" aria-hidden="true">
        {marks.filter((mark) => mark > 0.005 && mark < 0.995).map((mark) => <i key={mark} className={mark <= place ? 'is-passed' : undefined} style={{ left: mark * 100 + '%' }} />)}
      </span>
      <span className="theoria-rail__fill" aria-hidden="true" />
      <span className="theoria-rail__point" aria-hidden="true" />
      <input type="range" min={0} max={STEPS} value={Math.round(place * STEPS)} onChange={(event) => onSeek(Number(event.target.value) / STEPS)} aria-label={label} aria-valuetext={valueText} />
    </div>
  );
}
