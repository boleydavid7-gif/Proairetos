import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Nav } from '../app/App';
import { useSettings, updateSettings } from '../app/state';
import { offerUndo } from '../app/undo';
import {
  defaultDrinkProfiles,
  formatVolume,
  id,
  REFERENCE_SOURCE,
  referenceAmounts,
  unitToOunces,
  volumeLabel,
  type Glass,
  type HydrosUnit,
} from '../core/drinks';
import { ScreenHeader } from '../app/ui';
import { ClockIcon, CupIcon, DropIcon, GearIcon, LeafIcon, MoreIcon, SunIcon, WaveIcon } from '../app/icons';
import { applyAppearance } from '../../app/appearance';
import { loadAppearance, loadQuietHours, saveAppearance, saveQuietHours, type Appearance, type StoredQuietHours } from '../../data/storage/preferences';
import { notifications } from '../../app/notify/notifications';
import { enableReminders, syncStatus } from '../../app/sync/syncController';
import AccountCard from '../../app/family/AccountCard';
import FamilyBackup from '../../app/family/FamilyBackup';

const intervals = [60, 90, 120, 180] as const;

function intervalLabel(minutes: number): string {
  if (minutes % 60 === 0) return `Every ${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
  return `Every ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="hydros-settings-row__icon" aria-hidden="true">{children}</span>;
}

function Chevron() {
  return <span className="hydros-settings-row__chevron" aria-hidden="true">›</span>;
}

function Switch({ on }: { on: boolean }) {
  return <span className={`hydros-switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>;
}

export default function SettingsPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const unit = (settings.unit ?? 'oz') as HydrosUnit;
  const [amount, setAmount] = useState(() => (settings.goalChosen ? formatVolume(settings.goalOz, unit) : ''));
  const reminders = settings.reminders === true;
  const interval = settings.reminderIntervalMinutes ?? 120;
  const when = settings.reminderWhen ?? 'waking';
  const [permission, setPermission] = useState(() => notifications.permission());
  const [quiet, setQuiet] = useState<StoredQuietHours>(() => loadQuietHours());
  const [theme, setTheme] = useState<Appearance['theme']>(() => loadAppearance().theme);
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const profiles = settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles();
  const glasses = settings.glasses ?? [];

  useEffect(() => {
    if (!reminders || sync.phase !== 'ready' || sync.reminders === 'on' || notifications.permission() !== 'granted') return;
    void enableReminders().catch(() => undefined);
  }, [reminders, sync.phase, sync.reminders]);

  const schedule = (change: { enabled?: boolean; intervalMinutes?: number; when?: 'waking' | 'work' }) =>
    notifications.setHydrationSchedule({ enabled: change.enabled ?? reminders, intervalMinutes: change.intervalMinutes ?? interval, when: change.when ?? when });

  const chooseGoal = (ounces: number) => {
    const goalOz = Math.max(1, Math.min(300, Math.round(ounces)));
    updateSettings({ goalOz, goalChosen: true });
    setAmount(formatVolume(goalOz, unit));
  };

  const updateGoal = (value: string) => {
    setAmount(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    updateSettings({ goalOz: Math.max(1, Math.min(300, Math.round(unitToOunces(parsed, unit)))), goalChosen: true });
  };

  const clearGoal = () => {
    const before = settings.goalOz;
    updateSettings({ goalChosen: false });
    setAmount('');
    offerUndo('Daily amount cleared', () => { updateSettings({ goalOz: before, goalChosen: true }); setAmount(formatVolume(before, unit)); });
  };

  const chooseUnit = (next: HydrosUnit) => {
    if (settings.goalChosen) setAmount(formatVolume(settings.goalOz, next));
    updateSettings({ unit: next });
  };

  const chooseTheme = (next: Appearance['theme']) => {
    setTheme(next);
    saveAppearance({ ...loadAppearance(), theme: next });
    applyAppearance();
  };

  const toggleReminders = async () => {
    const next = !reminders;
    updateSettings({ reminders: next });
    schedule({ enabled: next });
    if (!next) return;
    try {
      const answer = await notifications.ask();
      setPermission(answer);
      if (answer === 'granted' && sync.phase === 'ready' && sync.reminders !== 'on') await enableReminders().catch(() => undefined);
      if (answer === 'denied') {
        updateSettings({ reminders: false });
        schedule({ enabled: false });
      }
    } catch {
      setPermission(notifications.permission());
    }
  };

  const updateQuiet = (change: Partial<StoredQuietHours>) => {
    const next = { ...quiet, ...change };
    setQuiet(next);
    saveQuietHours(next);
    notifications.refreshSoon();
  };

  const changeGlass = (glassId: string, change: Partial<Glass>) => updateSettings({ glasses: glasses.map((glass) => (glass.id === glassId ? { ...glass, ...change } : glass)) });
  const removeGlass = (glass: Glass) => {
    const before = glasses;
    updateSettings({ glasses: glasses.filter((each) => each.id !== glass.id) });
    offerUndo(`${glass.label} removed`, () => updateSettings({ glasses: before }));
  };
  const addGlass = () => updateSettings({ glasses: [...glasses, { id: id(), label: 'Cup', amountOz: unit === 'oz' ? 12 : unitToOunces(350, 'ml'), profileId: 'water' }] });

  return (
    <div className="hydros-screen hydros-settings">
      <ScreenHeader title="Settings" onBack={nav.back} />

      <SettingsGroup title="Daily amount">
        <label className="hydros-settings-row"><Icon><DropIcon /></Icon><span className="hydros-settings-row__name">From drinks, each day</span><input className="hydros-settings-row__input" aria-label={`Daily amount in ${unit}`} type="number" inputMode="decimal" min="1" step={unit === 'L' ? .1 : 1} value={amount} placeholder="None" onChange={(event) => updateGoal(event.target.value)} onBlur={() => settings.goalChosen && setAmount(formatVolume(settings.goalOz, unit))} /><b>{unit}</b></label>
        <div className="hydros-reference">
          <span>Reference amounts from drinks</span>
          {referenceAmounts.map((reference) => (
            <div className="hydros-reference__row" key={reference.id}>
              <span><strong>{reference.label}</strong><small>{volumeLabel(reference.drinksOz, unit)} from drinks · {volumeLabel(reference.totalOz, unit)} in all</small></span>
              <button type="button" onClick={() => chooseGoal(reference.drinksOz)}>Use</button>
            </div>
          ))}
          <small className="hydros-reference__source">{REFERENCE_SOURCE}. Heat, effort, pregnancy and health change it.</small>
        </div>
        {settings.goalChosen && <button type="button" className="hydros-settings-row hydros-settings-row--button" onClick={clearGoal}><Icon><MoreIcon /></Icon><span className="hydros-settings-row__name">No daily amount</span><Chevron /></button>}
        <button type="button" className="hydros-settings-row hydros-settings-row--button" role="switch" aria-checked={settings.runDayExtra !== false} onClick={() => updateSettings({ runDayExtra: settings.runDayExtra === false })}><Icon><WaveIcon /></Icon><span className="hydros-settings-row__name">A little more on run days, from Askesis</span><Switch on={settings.runDayExtra !== false} /></button>
      </SettingsGroup>

      <SettingsGroup title="Your glasses">
        {glasses.map((glass) => (
          <div className="hydros-glass-row" key={glass.id + unit}>
            <input aria-label="Name" value={glass.label} maxLength={30} onChange={(event) => changeGlass(glass.id, { label: event.target.value })} />
            <input aria-label={`Amount in ${unit}`} type="number" inputMode="decimal" min="0" step={unit === 'L' ? .05 : 1} defaultValue={formatVolume(glass.amountOz, unit)} onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value > 0) changeGlass(glass.id, { amountOz: unitToOunces(value, unit) }); }} />
            <b>{unit}</b>
            <select aria-label="Drink" value={glass.profileId} onChange={(event) => changeGlass(glass.id, { profileId: event.target.value })}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select>
            <button type="button" aria-label={`Remove ${glass.label}`} onClick={() => removeGlass(glass)}>×</button>
          </div>
        ))}
        {glasses.length < 6 && <button type="button" className="hydros-settings-row hydros-settings-row--button" onClick={addGlass}><Icon><CupIcon /></Icon><span className="hydros-settings-row__name">Add a glass or bottle</span><Chevron /></button>}
        <button type="button" className="hydros-settings-row hydros-settings-row--button" onClick={() => nav.go({ name: 'drinkTypes' })}><Icon><LeafIcon /></Icon><span className="hydros-settings-row__name">Drink types</span><span className="hydros-settings-row__value">Caffeine and more</span><Chevron /></button>
      </SettingsGroup>

      <SettingsGroup title="Reminders">
        <button type="button" className="hydros-settings-row hydros-settings-row--button" role="switch" aria-checked={reminders} onClick={() => void toggleReminders()}><Icon><ClockIcon /></Icon><span className="hydros-settings-row__name">Reminders</span><Switch on={reminders} /></button>
        {reminders && <>
          <label className="hydros-settings-row"><Icon><ClockIcon /></Icon><span className="hydros-settings-row__name">How often</span><select aria-label="How often" value={interval} onChange={(event) => { const next = Number(event.target.value); updateSettings({ reminderIntervalMinutes: next }); schedule({ intervalMinutes: next }); }}>{intervals.map((value) => <option value={value} key={value}>{intervalLabel(value)}</option>)}</select><Chevron /></label>
          <label className="hydros-settings-row"><Icon><SunIcon /></Icon><span className="hydros-settings-row__name">When</span><select aria-label="When" value={when} onChange={(event) => { const next = event.target.value === 'work' ? 'work' : 'waking'; updateSettings({ reminderWhen: next }); schedule({ when: next }); }}><option value="waking">Waking hours</option><option value="work">During work</option></select><Chevron /></label>
          <details className="hydros-settings-details"><summary className="hydros-settings-row"><Icon><SunIcon /></Icon><span className="hydros-settings-row__name">Quiet hours</span><span className="hydros-settings-row__value">{quiet.start} – {quiet.end}</span><Chevron /></summary><div className="hydros-time-fields"><label>From <input type="time" value={quiet.start} onChange={(event) => updateQuiet({ start: event.target.value })} /></label><label>Until <input type="time" value={quiet.end} onChange={(event) => updateQuiet({ end: event.target.value })} /></label></div></details>
        </>}
        {permission === 'denied' ? <p className="hydros-settings-hint">Notifications are blocked for this site. Allow them in your browser settings.</p> : permission === 'unsupported' && reminders ? <p className="hydros-settings-hint">This browser cannot show notifications. Add HYDROS to your Home Screen to receive them.</p> : null}
      </SettingsGroup>

      <SettingsGroup title="Units"><div className="hydros-settings-row hydros-settings-row--static"><Icon><CupIcon /></Icon><span className="hydros-settings-row__name">Measurement units</span><div className="hydros-unit-switch">{(['oz', 'ml', 'L'] as HydrosUnit[]).map((value) => <button type="button" key={value} className={unit === value ? 'is-selected' : ''} onClick={() => chooseUnit(value)}>{value}</button>)}</div></div></SettingsGroup>

      <SettingsGroup title="Appearance"><label className="hydros-settings-row"><Icon><SunIcon /></Icon><span className="hydros-settings-row__name">Theme</span><select aria-label="Theme" value={theme} onChange={(event) => chooseTheme(event.target.value as Appearance['theme'])}><option value="system">Automatic</option><option value="dark">Dark</option><option value="light">Light</option></select><Chevron /></label></SettingsGroup>

      <section className="hydros-settings-group" aria-label="Your data">
        <h2>Your data</h2>
        <AccountCard app="HYDROS" what="What you drink and your settings" waiting="Drinks" />
        <FamilyBackup />
      </section>

      <SettingsGroup title="More">
        <a className="hydros-settings-row hydros-settings-row--link" href="/?open=settings%3Aprivacy"><Icon><GearIcon /></Icon><span className="hydros-settings-row__name">Privacy</span><Chevron /></a>
        <a className="hydros-settings-row hydros-settings-row--link" href="/?open=settings%3Ahelp"><Icon><LeafIcon /></Icon><span className="hydros-settings-row__name">Help</span><Chevron /></a>
      </SettingsGroup>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="hydros-settings-group" aria-label={title}><h2>{title}</h2><div className="hydros-settings-list">{children}</div></section>;
}
