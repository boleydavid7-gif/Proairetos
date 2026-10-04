import { useState } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, DownloadIcon, SettingsIcon } from '../app/icons';
import { downloadBillCalendar } from '../core/calendar';
import { useAccount, useBills } from '../app/state';
import { exportAll, restore } from '../data/store';
import { PageTop } from '../app/ui';

export default function MorePage({ nav, about = false }: { nav: Nav; about?: boolean }) {
  const bills = useBills() ?? [];
  const account = useAccount();
  const [message, setMessage] = useState('');

  if (about) {
    return (
      <div className="page oiko-page">
        <PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button><p className="label">About</p></PageTop>
        <h1 className="title">A place for what sustains you.</h1>
        <p className="lead">Oikonomia means the care and management of a household. It keeps the essentials in view without turning them into a score.</p>
        <section className="card"><span className="card__eyebrow">The family</span><p className="muted">Proairetos helps you choose. Askesis helps you practice. SOMA helps you nourish yourself. Oikonomia helps you tend what makes daily life possible.</p></section>
      </div>
    );
  }

  async function downloadBackup() {
    const file = await exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'oikonomia-backup.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('A copy of your bills is ready.');
  }

  async function importBackup(file: File) {
    try {
      const count = await restore(JSON.parse(await file.text()));
      setMessage(count + ' ' + (count === 1 ? 'bill' : 'bills') + ' brought back.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That backup could not be read.');
    }
  }

  return (
    <div className="page oiko-page">
      <PageTop><div><p className="label">Oikonomia</p><h1 className="title">More</h1></div></PageTop>
      <section className="oiko-more-list">
        <button type="button" className="row" onClick={() => downloadBillCalendar(bills)}><span className="row__icon"><CalendarIcon size={21} /></span><span className="row__text"><strong>Save to your calendar</strong><small>Apple, Google, or Outlook · next year</small></span></button>
        <button type="button" className="row" onClick={() => void downloadBackup()}><span className="row__icon"><DownloadIcon size={21} /></span><span className="row__text"><strong>Back up your bills</strong><small>{bills.length} {bills.length === 1 ? 'bill' : 'bills'} on this device</small></span></button>
        <label className="row"><span className="row__icon"><DownloadIcon size={21} /></span><span className="row__text"><strong>Restore a backup</strong><small>Bring bills back from a JSON file</small></span><input className="oiko-file-input" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.currentTarget.value = ''; }} /></label>
        <button type="button" className="row" onClick={() => window.location.assign('/settings')}><span className="row__icon"><SettingsIcon size={21} /></span><span className="row__text"><strong>Appearance and account</strong><small>Shared with Proairetos</small></span></button>
      </section>

      <section className="oiko-family-links">
        <p className="label">The family</p>
        <a className="row" href="/"><span className="row__text"><strong>Proairetos</strong><small>Your days, values, and reflections</small></span></a>
        <a className="row" href="/askesis/"><span className="row__text"><strong>Askesis</strong><small>Running, from your first walk-run</small></span></a>
        <a className="row" href="/soma/"><span className="row__text"><strong>SOMA</strong><small>Recipes, groceries, and simple food</small></span></a>
      </section>

      {message && <p className="oiko-success" role="status">{message}</p>}
      {account.phase === 'ready' && <p className="oiko-sync-note">Synced with {account.email ?? 'your Proairetos account'}.</p>}
      <p className="hint">When your Proairetos calendar feed is on, new Oikonomia dates update there after sync. A saved calendar file works without an account.</p>
      <button type="button" className="text-link" onClick={() => nav.go({ name: 'about' })}>About Oikonomia</button>
    </div>
  );
}
