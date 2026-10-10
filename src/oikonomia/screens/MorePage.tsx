import { useState } from 'react';
import type { Nav } from '../app/App';
import { DownloadIcon, SettingsIcon, WalletIcon } from '../app/icons';
import { useAccount, useBills, useSettings } from '../app/state';
import { exportAll, loadSettings, restore, saveSettings } from '../data/store';
import { PageTop } from '../app/ui';
import AccountSection from '../../features/settings/AccountSection';

export default function MorePage({ nav, about = false }: { nav: Nav; about?: boolean }) {
  const bills = useBills() ?? [];
  const account = useAccount();
  const settings = useSettings();
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
    setMessage('A copy of your bills and monthly plans is ready.');
  }

  async function importBackup(file: File) {
    try {
      const count = await restore(JSON.parse(await file.text()));
      setMessage(count + ' ' + (count === 1 ? 'record' : 'records') + ' brought back.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That backup could not be read.');
    }
  }

  return (
    <div className="page oiko-page">
      <PageTop><h1 className="title">More</h1></PageTop>
      <section className="oiko-more-list">
        <button type="button" className="row" onClick={() => nav.go({ name: 'budget' })}><span className="row__icon"><WalletIcon size={21} /></span><span className="row__text"><strong>Budget</strong><small>Set your monthly allowance</small></span></button>
        <button type="button" className="row" onClick={() => void downloadBackup()}><span className="row__icon"><DownloadIcon size={21} /></span><span className="row__text"><strong>Back up your bills</strong><small>{bills.length} {bills.length === 1 ? 'bill' : 'bills'} on this device</small></span></button>
        <label className="row"><span className="row__icon"><DownloadIcon size={21} /></span><span className="row__text"><strong>Restore a backup</strong><small>Bring bills back from a JSON file</small></span><input className="oiko-file-input" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.currentTarget.value = ''; }} /></label>
        <button type="button" className="row" onClick={() => window.location.assign('/settings')}><span className="row__icon"><SettingsIcon size={21} /></span><span className="row__text"><strong>Appearance and account</strong><small>Shared with Proairetos</small></span></button>
      </section>

      <section className="oiko-options">
        <p className="label">Options</p>
        <label className="field">
          <span className="field__label">Plan week starts</span>
          <select
            className="input"
            value={settings.planWeekStart}
            onChange={(event) => saveSettings({ ...loadSettings(), planWeekStart: Number(event.target.value) })}
          >
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
        </label>
      </section>

      <section className="oiko-family-links">
        <p className="label">Family</p>
        <div className="oiko-family-grid">
          <a className="row" href="/"><span className="row__icon"><img className="row__app" src="/icons/icon.svg" alt="" width={28} height={28} /></span><span className="row__text"><strong>Proairetos</strong></span></a>
          <a className="row" href="/askesis/"><span className="row__icon"><img className="row__app" src="/askesis/icon.svg" alt="" width={28} height={28} /></span><span className="row__text"><strong>Askesis</strong></span></a>
          <a className="row" href="/soma/"><span className="row__icon"><img className="row__app" src="/soma/icon.svg" alt="" width={28} height={28} /></span><span className="row__text"><strong>SOMA</strong></span></a>
          <a className="row" href="/hydros/"><span className="row__icon"><img className="row__app" src="/hydros/icon.svg" alt="" width={28} height={28} /></span><span className="row__text"><strong>HYDROS</strong></span></a>
        </div>
      </section>

      {message && <p className="oiko-success" role="status">{message}</p>}
      {account.phase === 'ready' && <p className="oiko-sync-note">Synced with {account.email ?? 'your Proairetos account'}.</p>}
      <AccountSection />
      <button type="button" className="text-link" onClick={() => nav.go({ name: 'about' })}>About Oikonomia</button>
    </div>
  );
}
