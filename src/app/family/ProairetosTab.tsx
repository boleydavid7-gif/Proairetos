import { LampIcon } from '../../lamplight/icons';

/** Proairetos's lantern-compass mark, drawn in the line style of the family's bars. */
export function ProairetosMark({ size = 22 }: { size?: number }) {
  return (
    <LampIcon
      size={size}
      glyph={{
        line: (
          <>
            <circle cx="12" cy="12" r="9" strokeDasharray="11 2.2" />
            <path d="M12 4.5 V8 M8.5 9.5 12 6.5 15.5 9.5 V16.5 Q15.5 18 14 18 H10 Q8.5 18 8.5 16.5 V9.5Z" />
            <path d="M12 11 C12 11 10 13.3 10 14.8 A2 2 0 0 0 14 14.8 C14 13.3 12 11 12 11Z" />
            <path d="M12 2.5 11 5.2 H13Z M12 21.5 11 18.8 H13Z M2.5 12 5.2 11 V13Z M21.5 12 18.8 11 V13Z" />
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
