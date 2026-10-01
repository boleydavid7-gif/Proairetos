import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { backupService, storageMode } from '../../app/services';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { countRecords, parseBackupFile, type BackupData } from '../../data/backup/format';
import { clearPreferences, lastBackupDate, recordBackup } from '../../data/storage/preferences';
import { signOut, syncStatus } from '../../app/sync/syncController';
import AccountSection from './AccountSection';

function download(text: string) {
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `proairetos-backup-${date}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function describeCounts(data: BackupData): string {
  const counts = countRecords(data);
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return [
    n(counts.lifeItems, 'item'),
    n(counts.reflections, 'reflection'),
    n(counts.decisions, 'decision'),
    n(counts.values, 'value'),
    n(counts.schedulePatterns, 'schedule'),
  ].join(', ');
}

function ExportSection() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(() => lastBackupDate());

  async function exportNow() {
    setBusy(true);
    try {
      download(await backupService.exportFile(password || undefined));
      recordBackup();
      setLast(lastBackupDate());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card" aria-label="Back up">
      <h2 className="section-label">Back up</h2>
      <p className="section-description">
        Saves everything to a file you keep: on your phone, in your own cloud storage, or by email to yourself.
      </p>
      <label className="plan-field">
        <span>Password (optional, recommended)</span>
        <input
          type="password"
          className="field-input"
          autoComplete="new-password"
          placeholder="Locks the file so only you can open it"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <p className="sheet__hint">
        {password
          ? 'Keep this password safe. Without it the backup cannot be opened, by anyone.'
          : 'Without a password the file can be read by anyone who has it, including your reflections.'}
      </p>
      <button type="button" className="chip chip--accent chip--wide" disabled={busy} onClick={exportNow}>
        {busy ? 'Preparing…' : 'Download backup'}
      </button>
      <p className="sheet__hint">
        {last ? `Last backup ${new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.` : 'No backup yet.'}
      </p>
    </section>
  );
}

function ImportSection() {
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState<{ data: BackupData; exportedAt: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function choose(file: File | undefined) {
    setError('');
    setReady(null);
    setPassword('');
    if (!file) return;
    const content = await file.text();
    try {
      const parsed = parseBackupFile(content);
      setText(content);
      setLocked(parsed.encrypted);
      if (!parsed.encrypted) setReady(await backupService.readFile(content));
    } catch (cause) {
      setText(null);
      setError(cause instanceof Error ? cause.message : 'This file could not be read.');
    }
  }

  async function unlock() {
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      setReady(await backupService.readFile(text, password));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This backup could not be opened.');
    } finally {
      setBusy(false);
    }
  }

  async function replace() {
    if (!ready) return;
    setBusy(true);
    try {
      await backupService.replaceAll(ready.data);
      window.location.reload();
    } catch {
      setError('Restoring stopped partway. Your backup file is unchanged; try again.');
      setBusy(false);
    }
  }

  return (
    <section className="settings-card" aria-label="Restore">
      <h2 className="section-label">Restore from a backup</h2>
      <p className="section-description">Replaces what is on this device with the backup. Nothing changes until you confirm.</p>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Backup file"
        onChange={(event) => choose(event.target.files?.[0])}
      />
      <button type="button" className="chip chip--wide" onClick={() => input.current?.click()}>
        Choose backup file
      </button>

      {locked && !ready && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            unlock();
          }}
        >
          <input
            type="password"
            className="field-input"
            aria-label="Backup password"
            placeholder="This backup is locked"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="button-accent" disabled={!password || busy}>
            {busy ? 'Opening…' : 'Open'}
          </button>
        </form>
      )}

      {ready && (
        <div className="restore-preview">
          <p>
            Backup from {new Date(ready.exportedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}:{' '}
            {describeCounts(ready.data)}.
          </p>
          <p className="sheet__hint">Everything currently on this device will be replaced.</p>
          <div className="chip-row">
            <button type="button" className="chip" onClick={async () => download(await backupService.exportFile())}>
              First, save what is here
            </button>
            <button type="button" className="chip chip--accent" disabled={busy} onClick={replace}>
              {busy ? 'Restoring…' : 'Replace with this backup'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function DeleteSection() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <section className="settings-card" aria-label="Delete everything">
      <h2 className="section-label">Delete everything</h2>
      <p className="section-description">
        Removes all your items, reflections, decisions, values, and schedules from this device. If you use sync, this device
        is signed out first, so your other devices and encrypted account are not affected.
      </p>
      {confirming ? (
        <div className="chip-row">
          <button type="button" className="button-quiet" onClick={() => setConfirming(false)}>
            Keep my data
          </button>
          <button
            type="button"
            className="chip"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              // Sign this device out first, so the deletion stays here and is not synced to other devices.
              if (syncStatus.get().phase !== 'unavailable' && syncStatus.get().phase !== 'signed-out') await signOut();
              await backupService.deleteAll();
              clearPreferences();
              window.location.reload();
            }}
          >
            Yes, delete everything on this device
          </button>
        </div>
      ) : (
        <button type="button" className="chip chip--wide" onClick={() => setConfirming(true)}>
          Delete everything…
        </button>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'device' | 'memory'>('device');
  useEffect(() => {
    storageMode.then(setMode);
  }, []);

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate('compass')}>
        <ArrowLeftIcon size={18} />
        Compass
      </button>
      <PageHeader title="Settings" subtitle="Your data stays yours." />
      <p className="section-description">
        {mode === 'device'
          ? 'Everything is stored on this device. If you turn on sync, it is encrypted here before anything is uploaded.'
          : 'This browser is not letting Proairetos save. Download a backup before closing the tab.'}
      </p>
      <AccountSection />
      <ExportSection />
      <ImportSection />
      <DeleteSection />
    </div>
  );
}
