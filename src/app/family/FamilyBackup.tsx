import { useRef, useState } from 'react';
import { countRecords, parseBackupFile, type BackupData } from '../../data/backup/format';
import { lastBackupDate, recordBackup } from '../../data/storage/preferences';
import { backupService } from '../services';
import { dayName, useDailyCopies } from './useDailyCopies';

/**
 * The family's one backup, for Askesis, SOMA and Oikonomia's "Your data" pages. It is
 * the same file Proairetos makes (Settings > Your data): every app's records
 * and settings. Making it here or there counts as the same last backup;
 * restoring it anywhere brings the family apps back.
 */
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function describe(data: BackupData): string {
  const counts = countRecords(data);
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return [n(counts.lifeItems, 'item'), n(counts.reflections, 'reflection'), n(counts.workouts, 'workout'), n(counts.recipes, 'recipe'), n(counts.bills, 'bill')].join(', ');
}

/** `older`: reads a backup file this app made before there was one for all three; returns what it brought in, or undefined if it is not one. */
export default function FamilyBackup({ older }: { older?: (text: string) => Promise<string | undefined> }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(() => lastBackupDate());
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string>();
  const [locked, setLocked] = useState(false);
  const [unlockWith, setUnlockWith] = useState('');
  const [ready, setReady] = useState<{ data: BackupData; exportedAt: string }>();
  const [problem, setProblem] = useState<string>();

  const save = async () => {
    setBusy(true);
    try {
      const file = await backupService.exportFile(password || undefined);
      const url = URL.createObjectURL(new Blob([file], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `proairetos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      recordBackup();
      setLast(lastBackupDate());
    } finally {
      setBusy(false);
    }
  };

  const choose = async (file: File | undefined) => {
    setProblem(undefined);
    setReady(undefined);
    if (!file) return;
    const content = await file.text();
    try {
      const parsed = parseBackupFile(content);
      setText(content);
      setLocked(parsed.encrypted);
      if (!parsed.encrypted) setReady(await backupService.readFile(content));
    } catch (cause) {
      const brought = await older?.(content).catch(() => undefined);
      setProblem(brought ?? (cause instanceof Error ? cause.message : 'This file could not be read.'));
    }
  };

  return (
    <>
      <section className="card family-backup" aria-label="Back up">
        <h2 className="card__title card__title--small">One backup for the family</h2>
        <p className="muted">Proairetos, Askesis, SOMA and Oikonomia, with their settings.</p>
        <label className="field">
          <span className="label">Password, if you like</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Locks the file so only you can open it"
          />
        </label>
        <button type="button" className="button-main" disabled={busy} onClick={() => void save()}>
          {busy ? 'Preparing…' : 'Save a backup file'}
        </button>
        <p className="hint">{last ? `Last backup ${when(last)}.` : 'No backup yet.'}</p>
      </section>

      <DailyCopies />

      <section className="card family-backup" aria-label="Restore">
        <h2 className="card__title card__title--small">Restore</h2>
        <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(event) => void choose(event.target.files?.[0])} />
        <button type="button" className="button-quiet" onClick={() => input.current?.click()}>
          Choose a backup file
        </button>
        {locked && !ready && text && (
          <form
            className="field"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                setReady(await backupService.readFile(text, unlockWith));
              } catch (cause) {
                setProblem(cause instanceof Error ? cause.message : 'This backup could not be opened.');
              }
            }}
          >
            <input className="input" type="password" aria-label="The backup’s password" value={unlockWith} onChange={(event) => setUnlockWith(event.target.value)} />
            <button type="submit" className="button-quiet" disabled={!unlockWith}>
              Open
            </button>
          </form>
        )}
        {ready && (
          <>
            <p>
              From {when(ready.exportedAt)}: {describe(ready.data)}.
            </p>
            <p className="muted">This replaces what is on this phone, in the family apps.</p>
            <button
              type="button"
              className="button-main"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await backupService.replaceAll(ready.data);
                  window.location.reload();
                } catch {
                  setProblem('Restoring stopped partway. The file is unchanged; try again.');
                  setBusy(false);
                }
              }}
            >
              Restore this backup
            </button>
          </>
        )}
        {problem && (
          <p className="hint" role="status">
            {problem}
          </p>
        )}
      </section>
    </>
  );
}

/** A copy made each day on this phone, the last seven kept; any day can be restored. */
function DailyCopies() {
  const { on, turn, copies, restore } = useDailyCopies();
  const [chosen, setChosen] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  return (
    <section className="card family-backup" aria-label="Daily copies">
      <h2 className="card__title card__title--small">Daily copies</h2>
      <button type="button" className="switch-row" role="switch" aria-checked={on} onClick={() => void turn(!on)}>
        <span className="switch-row__text">
          <span>Keep a copy each day</span>
          <span className="switch-row__detail">On this phone, the last seven days.</span>
        </span>
        <span className={`switch${on ? ' switch--on' : ''}`} aria-hidden="true" />
      </button>
      {copies.length > 0 && (
        <ul className="daily-copies">
          {copies.map((copy) => (
            <li key={copy.day}>
              <button type="button" className="button-quiet" aria-pressed={chosen === copy.day} onClick={() => setChosen(chosen === copy.day ? undefined : copy.day)}>
                {dayName(copy.day)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {chosen && (
        <>
          <p className="muted">This replaces what is on this phone, in the family apps, with {dayName(chosen)}’s copy.</p>
          <button
            type="button"
            className="button-main"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await restore(chosen);
              } catch {
                setProblem('Restoring stopped partway. Try again.');
                setBusy(false);
              }
            }}
          >
            Restore this copy
          </button>
          <button type="button" className="button-quiet" onClick={() => setChosen(undefined)}>
            Cancel
          </button>
        </>
      )}
      {problem && (
        <p className="hint" role="status">
          {problem}
        </p>
      )}
    </section>
  );
}
