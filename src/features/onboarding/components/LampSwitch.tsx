import { useEffect, useRef, type PointerEvent } from 'react';
import { tap } from '../../../app/feel';

const HOLD_MS = 900;
const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The first thing the person does is a choice: hold, and the lamp warms until the room is lit. The warmth follows the
 * hold (`--hold` on the welcome, so the room brightens with it) and eases back if they let go early. A keyboard or
 * screen reader press lights it at once, as does any press with reduced motion.
 */
export default function LampSwitch({ onLit }: { onLit: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const started = useRef(0);
  const done = useRef(false);

  const room = () => button.current?.closest<HTMLElement>('.onboarding-layout') ?? null;
  const show = (hold: number) => {
    button.current?.style.setProperty('--hold', String(hold));
    room()?.style.setProperty('--hold', String(hold));
  };
  const light = () => {
    if (done.current) return;
    done.current = true;
    cancelAnimationFrame(frame.current);
    show(1);
    tap(18);
    onLit();
  };
  const step = (now: number) => {
    const hold = Math.min(1, (now - started.current) / HOLD_MS);
    // Eased, so the light gathers slowly at first and then comes up.
    show(hold * hold * (3 - 2 * hold));
    if (hold >= 1) light();
    else frame.current = requestAnimationFrame(step);
  };
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || done.current) return;
    if (still()) return light();
    event.currentTarget.setPointerCapture(event.pointerId);
    button.current?.classList.remove('is-letting-go');
    started.current = performance.now();
    tap();
    frame.current = requestAnimationFrame(step);
  };
  const letGo = () => {
    if (done.current) return;
    cancelAnimationFrame(frame.current);
    button.current?.classList.add('is-letting-go');
    show(0);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div className="lamp-switch">
      <button
        ref={button}
        type="button"
        className="lamp-switch__button"
        aria-label="Light the lamp"
        onPointerDown={press}
        onPointerUp={letGo}
        onPointerCancel={letGo}
        onContextMenu={(event) => event.preventDefault()}
        // A press with no pointer (keyboard, switch control, screen reader) lights it at once.
        onClick={(event) => event.detail === 0 && light()}
      >
        <svg className="lamp-switch__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" pathLength={1} />
        </svg>
        <span className="lamp-switch__flame" aria-hidden="true" />
      </button>
      <p className="lamp-switch__hint" aria-hidden="true">Hold to light</p>
    </div>
  );
}
