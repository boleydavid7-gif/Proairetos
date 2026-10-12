/** Proairetos's compass, drawn in the line style of the family's bars. */
export function ProairetosMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 4.5 13.6 10.4 19.5 12 13.6 13.6 12 19.5 10.4 13.6 4.5 12 10.4 10.4Z" />
    </svg>
  );
}

/**
 * The way back to Proairetos from any app in the family: the last place on its bar. A link, so it works offline
 * through Proairetos's own worker and opens wherever the person keeps Proairetos.
 */
export default function ProairetosTab({ className = 'tab-bar__item', size = 22 }: { className?: string; size?: number }) {
  return (
    <a className={`${className} proairetos-tab`} href="/">
      <ProairetosMark size={size} />
      <span>Proairetos</span>
    </a>
  );
}
