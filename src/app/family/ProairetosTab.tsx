import { LampIcon } from '../../lamplight/icons';

/** Proairetos's lantern and compass points (the app icon), drawn in the line style of the family's bars. */
export function ProairetosMark({ size = 22 }: { size?: number }) {
  return (
    <LampIcon
      size={size}
      glyph={{
        line: (
          <>
            <path d="M12 1.6V3.8M12 20.4V22.4M1.6 13H4.4M19.6 13H22.4" />
            <path d="M10.2 7V6.4A1.8 1.8 0 0 1 13.8 6.4V7" />
            <path d="M8 8.2H16L17.4 9.6H6.6Z" />
            <path d="M8.2 10.6 9.2 17.4H14.8L15.8 10.6" />
          </>
        ),
        lit: <path d="M12 11.6C11.2 12.7 10.7 13.5 10.7 14.5A1.3 1.3 0 0 0 13.3 14.5C13.3 13.5 12.8 12.7 12 11.6Z" />,
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
