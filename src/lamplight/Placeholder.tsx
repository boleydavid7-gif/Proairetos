/*
 * The shape of what is on its way, shimmering softly (`.ll-skeleton` in components.css), in place of a bare "Opening…":
 * lines of text, list rows or cards. Screen readers hear the label once.
 */

const LINE_WIDTHS = ['96%', '88%', '92%', '74%', '90%', '84%', '60%'];

export function Placeholder({ label, kind = 'rows', count = 3 }: { label: string; kind?: 'lines' | 'rows' | 'cards'; count?: number }) {
  return (
    <div className={`ll-skeleton-stack ll-skeleton-stack--${kind}`} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`ll-skeleton ll-skeleton--${kind}`} style={kind === 'lines' ? { width: LINE_WIDTHS[index % LINE_WIDTHS.length] } : undefined} />
      ))}
    </div>
  );
}
