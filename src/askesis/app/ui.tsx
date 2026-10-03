import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BackIcon, HomeIcon, LearnIcon, LogIcon, Mark, MoreIcon, TrainIcon } from './icons';

export type Tab = 'home' | 'learn' | 'train' | 'log' | 'more';

const tabs: { id: Tab; label: string; Icon: (p: { size?: number }) => ReactNode }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'learn', label: 'Learn', Icon: LearnIcon },
  { id: 'train', label: 'Train', Icon: TrainIcon },
  { id: 'log', label: 'Log', Icon: LogIcon },
  { id: 'more', label: 'More', Icon: MoreIcon },
];

export function TabBar({ current, onPick }: { current: Tab | undefined; onPick: (tab: Tab) => void }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="tab-bar__item"
          aria-current={current === id ? 'page' : undefined}
          onClick={() => onPick(id)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand${light ? ' brand--light' : ''}`}>
      <Mark size={30} />
      <span className="brand__words">
        <span className="brand__name">ASKESIS</span>
        <span className="brand__by">by Proairetos</span>
      </span>
    </div>
  );
}

export function BackLink({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button type="button" className="back-link" onClick={onBack}>
      <BackIcon size={18} />
      {label}
    </button>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  small = false,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
  small?: boolean;
}) {
  const at = Math.max(0, options.findIndex((option) => option.id === value));
  return (
    <div
      className={`segmented${small ? ' segmented--small' : ''}`}
      role="group"
      aria-label={label}
      style={{ '--count': options.length, '--at': at } as CSSProperties}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          className="segmented__option"
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Hero({ image, children, tall = false }: { image: string; children?: ReactNode; tall?: boolean }) {
  return (
    <header className={`hero${tall ? ' hero--tall' : ''}`}>
      <img className="hero__image" src={image} alt="" />
      <div className="hero__shade" />
      <div className="hero__content">{children}</div>
    </header>
  );
}

export function Switch({ on, label, detail, onToggle }: { on: boolean; label: string; detail?: string; onToggle: () => void }) {
  return (
    <button type="button" className="switch-row" role="switch" aria-checked={on} onClick={onToggle}>
      <span className="switch-row__text">
        <span>{label}</span>
        {detail && <span className="switch-row__detail">{detail}</span>}
      </span>
      <span className={`switch${on ? ' switch--on' : ''}`} aria-hidden="true" />
    </button>
  );
}

// ---------- Undo ----------

type UndoNote = { id: number; text: string; undo: () => void };
const UndoContext = createContext<(text: string, undo: () => void) => void>(() => undefined);

export const useUndo = () => useContext(UndoContext);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [note, setNote] = useState<UndoNote>();
  const timer = useRef<number>(undefined);
  const offer = useCallback((text: string, undo: () => void) => {
    window.clearTimeout(timer.current);
    const id = Date.now();
    setNote({ id, text, undo });
    timer.current = window.setTimeout(() => setNote((current) => (current?.id === id ? undefined : current)), 8000);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <UndoContext.Provider value={offer}>
      {children}
      {note && (
        <div className="toast" role="status">
          <span>{note.text}</span>
          <button
            type="button"
            className="toast__undo"
            onClick={() => {
              note.undo();
              setNote(undefined);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

/** "Mon 28", "Today", "Tomorrow". */
export function dayLabel(date: string, today: string, long = false): string {
  const d = new Date(`${date}T12:00:00`);
  const t = new Date(`${today}T12:00:00`);
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const day = long ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : String(d.getDate());
  return `${weekday} ${day}`;
}

export function greeting(): string {
  const hour = new Date().getHours();
  return hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
