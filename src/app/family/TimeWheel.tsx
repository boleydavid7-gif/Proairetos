import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { tap } from '../feel';
import './timeWheel.css';

/*
 * Apple's way of picking a time: a field that shows the value and, tapped, opens wheels in place that snap to a row
 * (hour, minute, AM/PM; or hours and minutes for a length). Nothing is a list of ready-made times.
 */

const ROW = 36;
const hour12 = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 !== false;
  } catch {
    return true;
  }
})();
const two = (value: number) => String(value).padStart(2, '0');

function Wheel({ label, items, index, onIndex }: { label: string; items: readonly string[]; index: number; onIndex: (next: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const settle = useRef<number>(0);
  const quiet = useRef(false);

  // Follow a value changed from outside (or the first look) without calling back.
  useEffect(() => {
    const element = box.current;
    if (!element || Math.round(element.scrollTop / ROW) === index) return;
    quiet.current = true;
    element.scrollTo({ top: index * ROW });
    window.setTimeout(() => { quiet.current = false; }, 120);
  }, [index]);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const element = box.current;
      if (!element || quiet.current) return;
      const next = Math.max(0, Math.min(items.length - 1, Math.round(element.scrollTop / ROW)));
      if (next !== index) {
        tap();
        onIndex(next);
      }
    }, 90);
  };

  const onKey = (event: KeyboardEvent) => {
    const by = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!by) return;
    event.preventDefault();
    onIndex(Math.max(0, Math.min(items.length - 1, index + by)));
  };

  return (
    <div
      ref={box}
      className="wheel__column"
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={index}
      aria-valuetext={items[index]}
      aria-valuemin={0}
      aria-valuemax={items.length - 1}
      onScroll={onScroll}
      onKeyDown={onKey}
    >
      {items.map((item) => <div key={item} className="wheel__row" aria-hidden="true">{item}</div>)}
    </div>
  );
}

function Field({ label, text, open, onToggle, children }: { label: string; text: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="wheel">
      <button type="button" className="wheel__field" aria-expanded={open} onClick={onToggle}>
        <span className="field__label">{label}</span>
        <span className="wheel__value">{text}</span>
      </button>
      {open && <div className="wheel__panel"><div className="wheel__bar" aria-hidden="true" />{children}</div>}
    </div>
  );
}

const clockText = (minutes: number) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60));

/** A time of day, in minutes into the day (0-1439); `step` is the minute wheel's step. */
export function TimeWheel({ label, minutes, step = 1, onChange }: { label: string; minutes: number; step?: number; onChange: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hours = hour12 ? Array.from({ length: 12 }, (_, at) => String(at === 0 ? 12 : at)) : Array.from({ length: 24 }, (_, at) => two(at));
  const minuteItems = Array.from({ length: Math.ceil(60 / step) }, (_, at) => two(at * step));
  const pm = hour >= 12;
  const hourIndex = hour12 ? hour % 12 : hour;
  const minuteIndex = Math.min(minuteItems.length - 1, Math.round(minute / step));
  const set = (nextHour: number, nextMinute: number) => onChange(nextHour * 60 + nextMinute);
  return (
    <Field label={label} text={clockText(minutes)} open={open} onToggle={() => setOpen(!open)}>
      <Wheel label={`${label}, hour`} items={hours} index={hourIndex} onIndex={(at) => set(hour12 ? (pm ? 12 : 0) + at : at, minute)} />
      <Wheel label={`${label}, minute`} items={minuteItems} index={minuteIndex} onIndex={(at) => set(hour, at * step)} />
      {hour12 && <Wheel label={`${label}, AM or PM`} items={['AM', 'PM']} index={pm ? 1 : 0} onIndex={(at) => set((hour % 12) + (at ? 12 : 0), minute)} />}
    </Field>
  );
}

/** A length in minutes, as hours and minutes (`step` is the minute wheel's step). */
export function DurationWheel({ label, minutes, step = 5, max = 12, onChange }: { label: string; minutes: number; step?: number; max?: number; onChange: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hourItems = Array.from({ length: max + 1 }, (_, at) => `${at} h`);
  const minuteItems = Array.from({ length: Math.ceil(60 / step) }, (_, at) => `${at * step} min`);
  const text = hours ? (minute ? `${hours} h ${minute} min` : `${hours} h`) : `${minute} min`;
  return (
    <Field label={label} text={text} open={open} onToggle={() => setOpen(!open)}>
      <Wheel label={`${label}, hours`} items={hourItems} index={hours} onIndex={(at) => onChange(Math.max(step, at * 60 + minute))} />
      <Wheel label={`${label}, minutes`} items={minuteItems} index={Math.min(minuteItems.length - 1, Math.round(minute / step))} onIndex={(at) => onChange(Math.max(step, hours * 60 + at * step))} />
    </Field>
  );
}
