import { LampIcon } from '../../lamplight/icons';

/** Proairetos's lantern-compass mark, drawn in the line style of the family's bars. */
export function ProairetosMark({ size = 22 }: { size?: number }) {
  return (
    <LampIcon
      size={size}
      glyph={{
        line: (
          <>
            <circle cx="12" cy="12" r="9" strokeDasharray="12 4" />
            <path d="M12 5.5 7.5 10 V17 Q7.5 18.5 9 18.5 H15 Q16.5 18.5 16.5 17 V10Z" />
            <path d="M12 10.5 C10.8 12.5 10 13.5 10 15 A2 2 0 0 0 14 15 C14 13.5 13.2 12.5 12 10.5Z" />
            <path d="M12 2.5 V4 M12 20 V21.5 M2.5 12 H4 M20 12 H21.5" />
          </>
        ),
        lit: <path d="M12 11 C12 11 10 13.3 10 14.8 A2 2 0 0 0 14 14.8 C14 13.3 12 11 12 11Z" />,
      }}
    />
  );
}

/**
 * The way back to Proairetos from any app in the family: the last place on its bar. A link, so it works offline
 * through Proairetos's own worker and opens wherever the person keeps Proairetos.
 */
export default function ProairetosTab({ className = 'tab-bar__item', size = 22 }: { className?: string; size?: number }) {
  return (
    <a className={`${className} proairetos-tab`} href="/" data-to-header="">
      <ProairetosMark size={size} />
      <span>Proairetos</span>
    </a>
  );
}
