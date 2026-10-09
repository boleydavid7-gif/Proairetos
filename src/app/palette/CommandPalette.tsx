import { useEffect, useMemo, useRef, useState } from 'react';
import { lifeService } from '../services';
import { useSheet } from '../../components/ui/useSheet';
import { atTime, toLocalDate } from '../../core/scheduling/dates';
import { describeQuickAdd, parseQuickAdd } from '../../core/capture/quickAdd';
import { useNavigate } from '../navigationContext';
import { useOverlays } from '../overlays/OverlayContext';
import type { AppRoute } from '../routes/routeTypes';

type Command = { id: string; label: string; words?: string; run: () => void };

/**
 * Ctrl or ⌘ and K: type to go anywhere, do something, or write a thing down. Whatever is typed that is not
 * a command can be saved as a new item, with the day, time and length it names read out of the words.
 * Nothing is saved until Enter on that row.
 */
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const navigate = useNavigate();
  const { openPause, startFocus, openSupport, offerUndo } = useOverlays();
  const field = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);
  const today = toLocalDate(new Date());
  // The sheet opens after this renders, so the field is focused once it is showing.
  useEffect(() => field.current?.focus(), []);

  const go = (route: AppRoute) => () => navigate(route);
  const commands: Command[] = useMemo(
    () => [
      { id: 'today', label: 'Go to Today', words: 'home now', run: go('today') },
      { id: 'reflect', label: 'Go to Reflect', words: 'journal timeline', run: go('reflect') },
      { id: 'plan', label: 'Go to Days ahead', words: 'plan list week', run: go('plan') },
      { id: 'calendar', label: 'Open the calendar', words: 'month year week', run: go('calendar') },
      { id: 'capture', label: 'Go to Capture', words: 'write down', run: go('capture') },
      { id: 'compass', label: 'Go to Compass', words: 'values goals people words', run: go('compass') },
      { id: 'journal', label: 'Write in your journal', words: 'reflect diary', run: go('journal') },
      { id: 'meditate', label: 'Meditate', words: 'breathe sit sounds music', run: go('meditate') },
      { id: 'schedule', label: 'Your schedule', words: 'work shifts', run: go('schedule') },
      { id: 'insights', label: 'Insights', words: 'counts recorded', run: go('insights') },
      { id: 'review', label: 'Weekly review', run: go('review') },
      { id: 'settings', label: 'Settings', words: 'preferences appearance backup lock', run: go('settings') },
      { id: 'pause', label: 'Pause for a minute', words: 'breathing space arrive', run: () => openPause() },
      { id: 'focus', label: 'Start a focus session', words: 'timer', run: () => startFocus() },
      { id: 'support', label: 'If things feel like too much', words: 'help crisis', run: () => openSupport() },
      {
        id: 'search',
        label: 'Search what you wrote',
        words: 'find',
        run: () => document.querySelector<HTMLButtonElement>('button[aria-label="Search"]')?.click(),
      },
    ],
    // The handlers only call stable functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? commands.filter((command) => needle.split(/\s+/).every((word) => `${command.label} ${command.words ?? ''}`.toLowerCase().includes(word)))
    : commands.slice(0, 8);
  const parsed = needle ? parseQuickAdd(query, today) : null;
  // The typed words become a row of their own, after any matching commands.
  const rows = [...matches.map((command) => ({ kind: 'command' as const, command })), ...(parsed ? [{ kind: 'add' as const }] : [])];
  const chosen = Math.min(active, Math.max(0, rows.length - 1));

  async function save() {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      const item = await lifeService.add(parsed.title, parsed.kind, {
        ...(parsed.day && !parsed.time ? { plannedFor: parsed.day } : {}),
        ...(parsed.minutes ? { plannedMinutes: parsed.minutes } : {}),
      });
      if (parsed.time) {
        const start = atTime(parsed.day ?? today, parsed.time);
        const end = parsed.minutes ? new Date(start.getTime() + parsed.minutes * 60_000) : undefined;
        await lifeService.scheduleSpan(item.id, start.toISOString(), end?.toISOString());
      }
      offerUndo(`Saved “${parsed.title}”`, async () => {
        await lifeService.deleteItem(item.id);
      });
      close();
    } catch {
      setSaving(false);
    }
  }

  function run(index: number) {
    const row = rows[index];
    if (!row) return;
    if (row.kind === 'add') {
      void save();
      return;
    }
    close();
    // After the sheet has gone, so a page or a sheet opens cleanly.
    window.setTimeout(row.command.run, 240);
  }

  return (
    <dialog
      ref={dialog}
      className="sheet sheet--tall palette"
      aria-label="Command palette"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <input
          ref={field}
          className="field-input field-input--large search-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-label="Go anywhere, or write something down"
          placeholder="Go anywhere, or write something down"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((chosen + 1) % Math.max(1, rows.length));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((chosen - 1 + rows.length) % Math.max(1, rows.length));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              run(chosen);
            }
          }}
        />
        {!needle && <p className="sheet__hint">Type a page or an action, or write something down and press Enter.</p>}
        <ul id="palette-list" className="search-list" role="listbox">
          {rows.map((row, index) => (
            <li key={row.kind === 'add' ? 'add' : row.command.id} role="option" aria-selected={index === chosen}>
              <button
                type="button"
                className={`search-row${index === chosen ? ' search-row--active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => run(index)}
              >
                {row.kind === 'add' && parsed ? (
                  <>
                    <span className="search-row__label">Write it down</span>
                    <span className="search-row__title">{parsed.title}</span>
                    {describeQuickAdd(parsed, today) && (
                      <span className="search-row__snippet">{describeQuickAdd(parsed, today)}</span>
                    )}
                  </>
                ) : (
                  row.kind === 'command' && <span className="search-row__title">{row.command.label}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {needle && rows.length === 0 && <p className="empty-note">Nothing matches that.</p>}
      </div>
    </dialog>
  );
}
