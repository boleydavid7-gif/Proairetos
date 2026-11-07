import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * The running block in a small window that stays on top of everything else on a computer (Document Picture-in-
 * Picture: Chrome and Edge). Pause and Stop here work from it; closing it changes nothing.
 */

type PipHost = { requestWindow: (options: { width: number; height: number }) => Promise<Window> };
const host = () => (typeof window === 'undefined' ? undefined : (window as unknown as { documentPictureInPicture?: PipHost }).documentPictureInPicture);

export function floatHere(): boolean {
  return Boolean(host());
}

export function FloatTimer({ time, title, paused, onPause, onStop }: { time: string; title: string; paused: boolean; onPause: () => void; onStop: () => void }) {
  const [win, setWin] = useState<Window | null>(null);

  useEffect(() => () => win?.close(), [win]);

  if (!floatHere()) return null;
  if (!win) {
    return (
      <button
        type="button"
        className="praxis-text-button praxis-float"
        onClick={() =>
          void host()!
            .requestWindow({ width: 280, height: 170 })
            .then((opened) => {
              opened.document.title = 'Praxis';
              opened.addEventListener('pagehide', () => setWin(null));
              setWin(opened);
            })
            .catch(() => undefined)
        }
      >
        Float the timer
      </button>
    );
  }

  const button = { font: 'inherit', fontSize: 14, minHeight: 36, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'inherit', cursor: 'pointer' } as const;
  return createPortal(
    <div style={{ boxSizing: 'border-box', height: '100vh', margin: 0, padding: 16, display: 'grid', alignContent: 'center', gap: 8, background: '#16181d', color: '#f1ede4', fontFamily: "'Google Sans Flex Variable', 'Google Sans Flex', system-ui, sans-serif", textAlign: 'center' }}>
      <div style={{ fontSize: 13, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ fontSize: 44, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }} role="timer">{time}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button type="button" style={button} onClick={onPause}>{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" style={button} onClick={onStop}>Stop here</button>
      </div>
    </div>,
    win.document.body,
  );
}
