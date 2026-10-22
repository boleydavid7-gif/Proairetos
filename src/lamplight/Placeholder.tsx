/*
 * The shape of what is on its way, shimmering softly (`.skeleton` in premium.css), in place of a bare "Opening…":
 * lines of text, list rows or cards. Screen readers hear the label once.
 */

const LINE_WIDTHS = ['96%', '88%', '92%', '74%', '90%', '84%', '60%'];

export function Placeholder({ label, kind = 'rows', count = 3 }: { label: string; kind?: 'lines' | 'rows' | 'cards'; count?: number }) {
  return (
    <div className={`skeleton-stack skeleton-stack--${kind}`} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`skeleton skeleton--${kind}`} style={kind === 'lines' ? { width: LINE_WIDTHS[index % LINE_WIDTHS.length] } : undefined} />
      ))}
    </div>
  );
}
