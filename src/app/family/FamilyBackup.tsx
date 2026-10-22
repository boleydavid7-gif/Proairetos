import StorageFacts from './StorageFacts';
import { BACKUP_ACCEPT, backupText, downloadBackup, packBackup } from '../../data/backup/packing';
import { localDayKey } from '../../data/storage/preferences';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLYPHS, LampIcon, Sym } from '../../lamplight/icons';
import './familyBackup.css';
import { countRecords, parseBackupFile, type BackupData } from '../../data/backup/format';
import { lastBackupDate, recordBackup } from '../../data/storage/preferences';
import { backupService } from '../services';
import { dayName, useDailyCopies } from './useDailyCopies';
import { useAddedApps } from './added';
import { chooseBackupFolder, forgetBackupFolder, useBackupFolder, writableFolder, writeToFolder } from './backupFolder';
import { dailyCopyToFolder } from './dailyCopy';

/**
 * The family's one backup, for Askesis, Soma, Oikonomia and Hydros's "Your data" pages. It is
 * the same file Proairetos makes (Settings > Your data): every app's records
 * and settings. Making it here or there counts as the same last backup;
 * restoring it anywhere brings the family apps back.
 */
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function describe(data: BackupData): string {
  const counts = countRecords(data);
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  // Only what the file holds: someone without Soma never reads "0 recipes".
  const parts = ([[counts.lifeItems, 'item'], [counts.reflections, 'reflection'], [counts.workouts, 'workout'], [counts.recipes, 'recipe'], [counts.bills, 'bill'], [counts.budgets, 'budget'], [counts.drinks, 'drink']] as const)
    .filter(([count]) => count > 0)
    .map(([count, word]) => n(count, word));
  return parts.join(', ') || 'Settings only';
}

type Older = (text: string) => Promise<string | undefined>;

/**
 * One row on an app's settings page, "Back up and restore" with the last backup's date; it opens the backup,
 * daily copies, backup folder and restore as a page of their own over the app. Back, Escape and the back gesture
 * close it (the page holds one history entry while open).
 * `older`: reads a backup file this app made before there was one for all three; returns what it brought in, or undefined if it is not one.
 * `inline`: on a page that is already about the person's data, the cards themselves.
 */
export default function FamilyBackup({ older, inline }: { older?: Older; inline?: boolean }) {
  if (inline) return <BackupCards older={older} />;
  return <BackupRow older={older} />;
}

function BackupRow({ older }: { older?: Older }) {
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState(false);
  const row = useRef<HTMLButtonElement>(null);
  const last = lastBackupDate();

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ familyData: true }, '');
    const onPop = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.history.back();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const show = () => {
    // Apps without the shared stylesheet style these pieces inside `.family-surface`; the page keeps that look.
    setSurface(Boolean(row.current?.closest('.family-surface')));
    setOpen(true);
  };

  return (
    <>
      <ul className="rows family-data-row">
        <li>
          <button ref={row} type="button" className="row" aria-haspopup="dialog" onClick={show}>
            <span className="row__icon"><LampIcon glyph={GLYPHS.download} size={22} /></span>
            <span className="row__text">
              <span>Back up and restore</span>
              <span className="row__detail">{last ? `Last backup ${when(last)}` : 'No backup yet'}</span>
            </span>
            <Sym name="chevron" className="family-data-row__chevron" />
          </button>
        </li>
      </ul>
      {open &&
        createPortal(
          <div className={`family-data${surface ? ' family-surface' : ''}`} role="dialog" aria-modal="true" aria-labelledby="family-data-title">
            <div className="family-data__inner">
              <button type="button" className="family-data__back" onClick={() => window.history.back()}>
                <Sym name="back" /> Back
              </button>
              <h1 id="family-data-title" className="family-data__title">Back up and restore</h1>
              <BackupCards older={older} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function BackupCards({ older }: { older?: Older }) {
  const [password, setPassword] = useState('');
  const added = useAddedApps();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(() => lastBackupDate());
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string>();
  const [locked, setLocked] = useState(false);
  const [unlockWith, setUnlockWith] = useState('');
  const [ready, setReady] = useState<{ data: BackupData; exportedAt: string }>();
  const [problem, setProblem] = useState<string>();

  const folder = useBackupFolder();
  const [savedTo, setSavedTo] = useState<string>();
  const save = async () => {
    setBusy(true);
    setSavedTo(undefined);
    try {
      const text = await backupService.exportFile(password || undefined);
      const day = localDayKey(new Date());
      // With a backup folder, the file goes there (asked again if the browser forgot); else it downloads.
      const chosen = folder.name ? await writableFolder(true) : undefined;
      if (chosen) {
        const { blob, extension } = await packBackup(text);
        await writeToFolder(chosen, `proairetos-backup-${day}.${extension}`, blob);
        setSavedTo(chosen.name);
      } else await downloadBackup(text, day);
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
    const content = await backupText(file).catch(() => '');
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
        <p className="muted">All the apps and their settings.{added.includes('theoria') ? ' Theoria’s books stay on the device.' : ''}</p>
        <StorageFacts />
        <label className="field">
          <span className="label">Password (optional)</span>
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
        <p className="hint">{savedTo ? `Saved in ${savedTo}.` : last ? `Last backup ${when(last)}.` : 'No backup yet.'}</p>
      </section>

      <DailyCopies />
      {folder.supported && <BackupFolder name={folder.name} />}

      <section className="card family-backup" aria-label="Restore">
        <h2 className="card__title card__title--small">Restore</h2>
        <input ref={input} type="file" accept={BACKUP_ACCEPT} hidden aria-label="Backup file" onChange={(event) => void choose(event.target.files?.[0])} />
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
            <p className="muted">This replaces what is on this device, in the family apps.</p>
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
                  setProblem('Restoring stopped partway. Your backup file is unchanged. Try again.');
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

/** A copy made each day on this device, the last seven kept; any day can be restored. */
/** A folder on this computer or phone where backups and daily copies are written too (Chrome and Edge). */
function BackupFolder({ name }: { name?: string }) {
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    setProblem(undefined);
    setBusy(true);
    try {
      if (!(await chooseBackupFolder())) return;
      await dailyCopyToFolder(await backupService.exportFile(), localDayKey(new Date()));
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setProblem('Couldn’t use that folder. Try another.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card family-backup" aria-label="Backup folder">
      <h2 className="card__title card__title--small">Backup folder</h2>
      <p className="muted">{name ? `Backups and daily copies also go to “${name}”.` : 'Backups and daily copies can also go to a folder you choose, such as one Drive or OneDrive keeps.'}</p>
      <div className="button-row">
        <button type="button" className="button-quiet" disabled={busy} onClick={() => void choose()}>{name ? 'Choose another' : 'Choose a folder'}</button>
        {name && <button type="button" className="text-link" onClick={() => void forgetBackupFolder()}>Stop using it</button>}
      </div>
      {problem && <p className="hint" role="alert">{problem}</p>}
    </section>
  );
}

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
          <span className="switch-row__detail">On this device, the last seven days.</span>
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
          <p className="muted">This replaces what is on this device, in the family apps, with {dayName(chosen)}’s copy.</p>
          <button
            type="button"
            className="button-main"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await restore(chosen);
              } catch {
                setProblem('Restoring stopped partway. Your backup file is unchanged. Try again.');
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
