import { PILL_COLORS, type PillLook } from '../core/medicines';

const color = (key?: string) => (key && PILL_COLORS[key]) || '#c8d0dc';

/** A small drawing of how a medicine looks: its shape in its color(s). */
export default function PillMark({ look, size = 28 }: { look?: PillLook; size?: number }) {
  const a = color(look?.color);
  const b = color(look?.color2 ?? look?.color);
  const edge = 'rgb(0 0 0 / 0.28)';
  const shape = look?.shape ?? 'round';
  return (
    <svg className="pill-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {shape === 'round' && <><circle cx="16" cy="16" r="10" fill={a} stroke={edge} /><line x1="9" y1="16" x2="23" y2="16" stroke={edge} strokeWidth="1.2" /></>}
      {shape === 'oval' && <ellipse cx="16" cy="16" rx="12" ry="7.5" fill={a} stroke={edge} transform="rotate(-30 16 16)" />}
      {shape === 'capsule' && (
        <g transform="rotate(-40 16 16)">
          <path d="M16 9h-6a7 7 0 0 0 0 14h6z" fill={a} stroke={edge} />
          <path d="M16 9h6a7 7 0 0 1 0 14h-6z" fill={b} stroke={edge} />
        </g>
      )}
      {shape === 'liquid' && <><path d="M11 5h10v4l3 4v13a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V13l3-4z" fill="none" stroke={a} strokeWidth="2" /><path d="M9.5 17h13v9H9.5z" fill={a} /></>}
      {shape === 'drops' && <path d="M16 5c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill={a} stroke={edge} />}
      {shape === 'inhaler' && <><path d="M12 4h8v14h-8z" fill={b} stroke={edge} /><path d="M9 16h14v9a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill={a} stroke={edge} /></>}
      {shape === 'patch' && <><rect x="6" y="6" width="20" height="20" rx="5" fill={a} stroke={edge} /><rect x="11" y="11" width="10" height="10" rx="2" fill={b} opacity="0.6" /></>}
      {shape === 'injection' && (
        <g transform="rotate(-45 16 16)" stroke={edge}>
          <rect x="11" y="9" width="10" height="16" rx="2" fill={a} />
          <rect x="14" y="4" width="4" height="5" fill={b} />
          <line x1="16" y1="25" x2="16" y2="30" strokeWidth="1.6" stroke={a} />
        </g>
      )}
    </svg>
  );
}
