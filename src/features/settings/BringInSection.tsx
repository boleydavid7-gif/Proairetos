import { useState } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import {
  detectFormat,
  fromCalendarEvents,
  fromCsv,
  fromGoogleTasks,
  fromText,
  type ImportResult,
  type ImportRow,
} from '../../core/import/readers';
import { formatLocalDay, formatTimeOf } from '../schedule/format';

const DAY = 86_400_000;

async function read(text: string, fileName?: string): Promise<ImportResult> {
  const format = detectFormat(text, fileName);
  if (format === 'ics') {
    // The calendar reader loads only when someone uses it.
    const { readIcs } = await import('../../core/calendar/readIcs');
    const now = Date.now();
    return fromCalendarEvents(readIcs(text, { start: new Date(now - DAY), end: new Date(now + 2 * 365 * DAY) }));
  }
  if (format === 'google') {
    try {
      const result = fromGoogleTasks(JSON.parse(text));
      if (result) return result;
    } catch {
      // Not JSON after all; read it as a list.
    }
    return fromText(text);
  }
  if (format === 'csv') return fromCsv(text);
  return fromText(text);
}

function when(row: ImportRow): string | undefined {
  if (row.scheduledAt) {
    const start = new Date(row.scheduledAt);
    return `${start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${formatTimeOf(start)}${row.endsAt ? `–${formatTimeOf(new Date(row.endsAt))}` : ''}`;
  }
  return row.plannedFor ? formatLocalDay(row.plannedFor) : undefined;
}

/**
 * Bring things in from another app: a calendar file, a spreadsheet or
 * Todoist export, Google Tasks from Takeout, or a pasted list. Everything
 * is shown first; nothing is saved until the person says so.
 */
export default function BringInSection() {
  const { offerUndo } = useOverlays();
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(text: string, fileName?: string) {
    setError('');
    setMessage('');
    try {
      const next = await read(text, fileName);
      setResult(next);
      // Things already finished in the other app start unticked.
      setChosen(new Set(next.rows.flatMap((row, index) => (row.done ? [] : [index]))));
      if (next.rows.length === 0) setError('Nothing to bring in from that.');
    } catch {
      setError('That file could not be read. A calendar file, a spreadsheet (CSV), Google Tasks, or a plain list works.');
    }
  }

  async function bringIn() {
    if (!result) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const [index, row] of result.rows.entries()) {
        if (!chosen.has(index)) continue;
        const item = await lifeService.add(row.title, row.kind ?? 'TODO', {
          source: 'IMPORT',
          ...(row.notes ? { notes: row.notes } : {}),
          ...(row.location ? { location: row.location } : {}),
          ...(row.plannedFor && !row.scheduledAt ? { plannedFor: row.plannedFor } : {}),
        });
        added.push(item.id);
        if (row.scheduledAt) await lifeService.scheduleSpan(item.id, row.scheduledAt, row.endsAt);
      }
      offerUndo(added.length === 1 ? 'Brought in 1 thing' : `Brought in ${added.length} things`, async () => {
        for (const id of added) await lifeService.deleteItem(id);
      });
      setMessage(added.length === 1 ? 'Brought in 1 thing.' : `Brought in ${added.length} things. They are in Capture and on their days.`);
      setResult(null);
      setPasted('');
    } catch {
      setError(added.length ? `Brought in ${added.length}; the rest could not be saved just now.` : 'Could not save just now.');
    } finally {
      setBusy(false);
    }
  }

  if (result && result.rows.length > 0) {
    const toggle = (index: number) => {
      const next = new Set(chosen);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      setChosen(next);
    };
    return (
      <section className="settings-card" aria-label="Review what to bring in">
        <p className="section-description">
          From {result.source}: {result.rows.length === 1 ? '1 thing' : `${result.rows.length} things`}. Untick
          anything you would rather not bring in.
        </p>
        {result.note && <p className="sheet__hint">{result.note}</p>}
        <div className="chip-row">
          <button type="button" className="text-link" onClick={() => setChosen(new Set(result.rows.map((_, index) => index)))}>
            Tick all
          </button>
          <button type="button" className="text-link" onClick={() => setChosen(new Set())}>
            Untick all
          </button>
        </div>
        <ul className="pick-list import-list">
          {result.rows.map((row, index) => (
            <li key={index}>
              <label className="pick-row">
                <input type="checkbox" checked={chosen.has(index)} onChange={() => toggle(index)} />
                <span className="pick-row__text">
                  <span>{row.title}</span>
                  <span className="pick-row__detail">
                    {[when(row), row.location, row.done ? 'Finished there' : undefined].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {error && <p className="form-error">{error}</p>}
        <div className="chip-row">
          <button type="button" className="button-accent" disabled={busy || chosen.size === 0} onClick={bringIn}>
            {busy ? 'Bringing in…' : `Bring in ${chosen.size}`}
          </button>
          <button type="button" className="button-quiet" onClick={() => setResult(null)}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-card" aria-label="Bring things in">
      <p className="section-description">
        Bring things in from another app. You see everything first, and nothing is saved until you choose. It stays on
        this device.
      </p>
      <ul className="import-sources">
        <li>
          <strong>A calendar file</strong> (.ics) from Google, Apple, or Outlook: events become things with a time.
        </li>
        <li>
          <strong>Todoist</strong> or any <strong>spreadsheet</strong> saved as CSV.
        </li>
        <li>
          <strong>Google Tasks</strong>, from Google Takeout (Tasks.json).
        </li>
        <li>
          <strong>A list</strong> from Notes, Apple Reminders, or anywhere: one per line, pasted below.
        </li>
      </ul>
      <label className="button-accent import-file">
        Choose a file
        <input
          type="file"
          accept=".ics,.csv,.json,.txt,text/calendar,text/csv,application/json,text/plain"
          className="visually-hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) await load(await file.text(), file.name);
          }}
        />
      </label>
      <textarea
        className="field-input field-input--area"
        rows={5}
        aria-label="Or paste a list"
        placeholder={'Or paste a list, one per line\nBook dentist\nRenew passport'}
        value={pasted}
        onChange={(event) => setPasted(event.target.value)}
      />
      <button type="button" className="chip" disabled={!pasted.trim()} onClick={() => load(pasted)}>
        Look through this list
      </button>
      {error && <p className="form-error">{error}</p>}
      {message && <p className="sheet__hint">{message}</p>}
      <p className="sheet__hint">To move everything from another Proairetos, use Back up and restore instead.</p>
    </section>
  );
}
