import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { tap } from '../../../app/feel';

/** How long the sails have to hold the wind, in all, before the closing words come in. */
const SAILED_MS = 2200;
const MAST_X = 160;
const MAST_TOP = 58;
const BOOM_Y = 146;
const REACH = 72;
const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The next wind: a new strength and often a new side, never the same as before. */
function nextWind(was: number): number {
  const side = Math.random() < 0.6 ? -Math.sign(was || 1) : Math.sign(was || 1);
  const strength = 0.45 + Math.random() * 0.5;
  return side * strength;
}

/**
 * Adjust your sails, played: the wind comes and goes on its own (not up to you); the sail is yours to set. Set it to
 * the wind and the sail fills and the boat moves on; once it has held the wind for a moment, `onSorted` brings the
 * closing words. Drag on the picture or use the slider (a keyboard moves it too).
 */
export default function Sails({ onSorted }: { onSorted: () => void }) {
  const [sail, setSail] = useState(-0.55);
  const [wind, setWind] = useState(0.8);
  const [filled, setFilled] = useState(false);
  const sailRef = useRef(sail);
  const windRef = useRef(wind);
  const sailed = useRef(0);
  const told = useRef(false);
  const svg = useRef<SVGSVGElement>(null);
  const sheet = useRef<SVGPathElement>(null);
  const boat = useRef<SVGGElement>(null);
  sailRef.current = sail;
  windRef.current = wind;

  // The wind changes on its own every few seconds.
  useEffect(() => {
    const timer = window.setInterval(() => setWind((was) => nextWind(was)), still() ? 7000 : 5200);
    return () => window.clearInterval(timer);
  }, []);

  // One frame loop draws the sail and moves the boat; nothing in it goes through React but the filled state.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let fill = 0;
    let drift = 0;
    let wasFilled = false;
    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const s = sailRef.current;
      const w = windRef.current;
      const trim = Math.max(0, 1 - Math.abs(s - w) / 0.55);
      // The sail fills and slackens over a short while rather than at once.
      fill += (trim - fill) * Math.min(1, dt / 220);
      const clewX = MAST_X + s * REACH;
      const belly = fill * 26 * Math.sign(w || 1) * Math.abs(w);
      const flutter = fill < 0.35 && !still() ? Math.sin(now / 90) * 4 : 0;
      sheet.current?.setAttribute(
        'd',
        `M${MAST_X} ${MAST_TOP} Q${(MAST_X + clewX) / 2 + belly + flutter} ${(MAST_TOP + BOOM_Y) / 2 + 6} ${clewX} ${BOOM_Y} L${MAST_X} ${BOOM_Y} Z`,
      );
      // Under way: the boat rises and falls on the swell and moves a little ahead; slack, it settles back.
      drift += ((fill > 0.6 ? 1 : 0) * 18 * Math.sign(w || 1) - drift) * Math.min(1, dt / 900);
      const swell = still() ? 0 : Math.sin(now / 700) * (1.5 + fill * 1.5);
      boat.current?.setAttribute('transform', `translate(${drift.toFixed(2)} ${swell.toFixed(2)}) rotate(${(swell * 0.6).toFixed(2)} ${MAST_X} 158)`);
      svg.current?.style.setProperty('--fill', fill.toFixed(3));
      const isFilled = fill > 0.6;
      if (isFilled !== wasFilled) {
        wasFilled = isFilled;
        setFilled(isFilled);
        if (isFilled) tap();
      }
      if (isFilled && !told.current) {
        sailed.current += dt;
        if (sailed.current >= SAILED_MS) {
          told.current = true;
          onSorted();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [onSorted]);

  const fromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 320;
    setSail(Math.max(-1, Math.min(1, (x - MAST_X) / REACH)));
  };

  return (
    <div className="sails" data-filled={filled || undefined}>
      <p className="sails__label sails__label--wind">
        The wind <span>Not up to you</span>
      </p>
      <svg
        ref={svg}
        className="sails__sea"
        viewBox="0 0 320 196"
        role="img"
        aria-label={filled ? 'The sail is full and the boat is under way.' : 'The sail is slack.'}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event);
        }}
        onPointerMove={(event) => event.buttons && fromPointer(event)}
      >
        <g className="sails__wind" data-side={wind < 0 ? 'left' : 'right'} style={{ '--strength': Math.abs(wind) } as CSSProperties}>
          {[22, 40, 58, 30, 50, 70].map((y, index) => (
            <path key={index} d={`M0 ${y} q 18 -5 36 0 t 36 0`} style={{ '--n': index } as CSSProperties} />
          ))}
        </g>
        <g className="sails__water">
          <path d="M-20 166 q 20 -5 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" />
          <path d="M-40 180 q 20 -4 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" />
        </g>
        <g ref={boat}>
          <path className="sails__sheet" ref={sheet} />
          <line className="sails__mast" x1={MAST_X} y1={MAST_TOP - 6} x2={MAST_X} y2={158} />
          <path className="sails__hull" d={`M${MAST_X - 46} 156 L${MAST_X + 46} 156 Q${MAST_X + 40} 170 ${MAST_X + 28} 172 L${MAST_X - 30} 172 Q${MAST_X - 40} 168 ${MAST_X - 46} 156 Z`} />
        </g>
      </svg>
      <label className="sails__control">
        <input
          type="range"
          min={-100}
          max={100}
          value={Math.round(sail * 100)}
          aria-label="Your sails"
          aria-valuetext={filled ? 'Full' : 'Slack'}
          onChange={(event) => setSail(Number(event.target.value) / 100)}
        />
        <span className="sails__label sails__label--sail">
          Your sails <span>Up to you</span>
        </span>
      </label>
    </div>
  );
}
