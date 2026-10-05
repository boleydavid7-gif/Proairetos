import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { useSettings, updateSettings } from '../app/state';
import {
  formatVolume,
  unitToOunces,
  volumeLabel,
  waterRecommendation,
  type HydrosActivity,
  type HydrosUnit,
} from '../core/drinks';
import { ScreenHeader } from '../app/ui';
import { BalanceIcon, BoltIcon, ClockIcon, CupIcon, DropIcon, GearIcon, LeafIcon, MoreIcon, SunIcon, WaveIcon } from '../app/icons';
import { applyAppearance } from '../../app/appearance';
import { loadAppearance, loadQuietHours, saveAppearance, saveQuietHours, type Appearance, type StoredQuietHours } from '../../data/storage/preferences';
import { notifications } from '../../app/notify/notifications';
import { FEEDBACK_EMAIL } from '../../app/siteAddress';

const intervals = [60, 120, 180] as const;

function intervalLabel(minutes: number): string {
  if (minutes % 60 === 0) return `Every ${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
  return `Every ${minutes} minutes`;
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
  const initialUnit = settings.unit ?? 'oz';
  const [amount, setAmount] = useState(() => formatVolume(settings.goalOz, initialUnit));
  const [weight, setWeight] = useState(() => settings.weightLb ? String(settings.weightLb) : '');
  const [height, setHeight] = useState(() => settings.heightIn ? String(settings.heightIn) : '');
  const [activity, setActivity] = useState<HydrosActivity>(settings.activity ?? 'moderate');
  const [unit, setUnit] = useState<HydrosUnit>(initialUnit);
  const [recommended, setRecommended] = useState(settings.useRecommendedRange === true);
  const [reminders, setReminders] = useState(settings.reminders === true);
  const [interval, setInterval] = useState(settings.reminderIntervalMinutes ?? 120);
  const [permission, setPermission] = useState(() => notifications.permission());
  const [quiet, setQuiet] = useState<StoredQuietHours>(() => loadQuietHours());
  const [theme, setTheme] = useState<Appearance['theme']>(() => loadAppearance().theme);
  const recommendation = useMemo(() => waterRecommendation({ weightLb: Number(weight), heightIn: Number(height), activity }), [weight, height, activity]);

  const updateProfile = (field: 'weightLb' | 'heightIn', value: string) => {
    const parsed = Number(value);
    updateSettings({ [field]: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined });
  };

  const updateGoal = (value: string) => {
    setAmount(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    updateSettings({ goalOz: Math.max(1, Math.min(300, Math.round(unitToOunces(parsed, unit)))) });
  };

  const chooseUnit = (next: HydrosUnit) => {
    setUnit(next);
    setAmount(formatVolume(settings.goalOz, next));
    updateSettings({ unit: next });
  };

  const chooseTheme = (next: Appearance['theme']) => {
    setTheme(next);
    saveAppearance({ ...loadAppearance(), theme: next });
    applyAppearance();
  };

  const toggleReminders = async () => {
    const next = !reminders;
    if (!next) {
      setReminders(false);
      updateSettings({ reminders: false });
      notifications.setHydrationSchedule({ enabled: false, intervalMinutes: interval });
      return;
    }
    setReminders(true);
    updateSettings({ reminders: true });
    notifications.setHydrationSchedule({ enabled: true, intervalMinutes: interval });
    try {
      const nextPermission = await notifications.ask();
      setPermission(nextPermission);
      if (nextPermission === 'denied') {
        setReminders(false);
        updateSettings({ reminders: false });
        notifications.setHydrationSchedule({ enabled: false, intervalMinutes: interval });
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

  return (
    <div className="hydros-screen hydros-settings">
      <ScreenHeader title="Settings" onBack={nav.back} />
      <p className="hydros-settings-lede">Customize Hydros to fit your life.</p>

      <SettingsGroup title="Profile">
        <label className="hydros-settings-row"><Icon><BalanceIcon /></Icon><span className="hydros-settings-row__name">Weight</span><input className="hydros-settings-row__input" aria-label="Weight in pounds" type="number" inputMode="decimal" min="1" max="700" value={weight} onChange={(event) => { setWeight(event.target.value); updateProfile('weightLb', event.target.value); }} placeholder="—" /><b>lb</b></label>
        <label className="hydros-settings-row"><Icon><BoltIcon /></Icon><span className="hydros-settings-row__name">Height</span><input className="hydros-settings-row__input" aria-label="Height in inches" type="number" inputMode="decimal" min="1" max="100" value={height} onChange={(event) => { setHeight(event.target.value); updateProfile('heightIn', event.target.value); }} placeholder="—" /><b>in</b></label>
        <label className="hydros-settings-row"><Icon><WaveIcon /></Icon><span className="hydros-settings-row__name">Activity level</span><select aria-label="Activity level" value={activity} onChange={(event) => { const next = event.target.value as HydrosActivity; setActivity(next); updateSettings({ activity: next }); }}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select><Chevron /></label>
      </SettingsGroup>

      <SettingsGroup title="Hydration goal">
        <label className="hydros-settings-row"><Icon><DropIcon /></Icon><span className="hydros-settings-row__name">Daily goal</span><input className="hydros-settings-row__input" aria-label={`Daily goal in ${unit}`} type="number" inputMode="decimal" min="1" max={unit === 'L' ? 8 : unit === 'ml' ? 9000 : 300} step={unit === 'L' ? .1 : 1} value={amount} onChange={(event) => updateGoal(event.target.value)} onBlur={() => setAmount(formatVolume(settings.goalOz, unit))} /><b>{unit}</b></label>
        <button type="button" className="hydros-settings-row hydros-settings-row--button" role="switch" aria-checked={recommended} onClick={() => { const next = !recommended; setRecommended(next); updateSettings({ useRecommendedRange: next }); }}><Icon><WaveIcon /></Icon><span className="hydros-settings-row__name">Use recommended range</span><Switch on={recommended} /></button>
        <div className="hydros-recommendation"><DropIcon size={30} /><div><span>Suggested for you</span>{recommendation ? <><strong>{volumeLabel(recommendation.drinkGoalOz, unit)} from drinks</strong><small>{volumeLabel(recommendation.totalNeedOz, unit)} total · about {volumeLabel(recommendation.foodWaterOz, unit)} from food</small></> : <small>Add weight, height, and activity to see a recommendation.</small>}</div>{recommendation ? <button type="button" onClick={() => { setAmount(formatVolume(recommendation.drinkGoalOz, unit)); updateSettings({ goalOz: recommendation.drinkGoalOz }); }}>Use</button> : null}</div>
      </SettingsGroup>

      <SettingsGroup title="Reminders">
        <button type="button" className="hydros-settings-row hydros-settings-row--button" role="switch" aria-checked={reminders} onClick={() => void toggleReminders()}><Icon><ClockIcon /></Icon><span className="hydros-settings-row__name">Reminders</span><Switch on={reminders} /></button>
        <label className="hydros-settings-row"><Icon><ClockIcon /></Icon><span className="hydros-settings-row__name">Reminder times</span><select aria-label="Reminder interval" value={interval} onChange={(event) => { const next = Number(event.target.value); setInterval(next); updateSettings({ reminderIntervalMinutes: next }); notifications.setHydrationSchedule({ enabled: reminders, intervalMinutes: next }); }} disabled={!reminders}>{intervals.map((value) => <option value={value} key={value}>{intervalLabel(value)}</option>)}</select><Chevron /></label>
        <details className="hydros-settings-details"><summary className="hydros-settings-row"><Icon><SunIcon /></Icon><span className="hydros-settings-row__name">Quiet hours</span><span className="hydros-settings-row__value">{quiet.start} – {quiet.end}</span><Chevron /></summary><div className="hydros-time-fields"><label>From <input type="time" value={quiet.start} onChange={(event) => updateQuiet({ start: event.target.value })} /></label><label>Until <input type="time" value={quiet.end} onChange={(event) => updateQuiet({ end: event.target.value })} /></label></div></details>
        {permission === 'denied' ? <p className="hydros-settings-hint">Notifications are blocked for this site. Allow them in your browser settings.</p> : permission === 'unsupported' && reminders ? <p className="hydros-settings-hint">Reminders are saved, but this browser cannot show notifications. Add Proairetos to your Home Screen to receive them.</p> : null}
      </SettingsGroup>

      <SettingsGroup title="Units"><div className="hydros-settings-row hydros-settings-row--static"><Icon><CupIcon /></Icon><span className="hydros-settings-row__name">Measurement units</span><div className="hydros-unit-switch">{(['oz', 'ml', 'L'] as HydrosUnit[]).map((value) => <button type="button" key={value} className={unit === value ? 'is-selected' : ''} onClick={() => chooseUnit(value)}>{value}</button>)}</div></div></SettingsGroup>

      <SettingsGroup title="Appearance"><label className="hydros-settings-row"><Icon><SunIcon /></Icon><span className="hydros-settings-row__name">Theme</span><select aria-label="Theme" value={theme} onChange={(event) => chooseTheme(event.target.value as Appearance['theme'])}><option value="system">Automatic</option><option value="dark">Dark</option><option value="light">Light</option></select><Chevron /></label></SettingsGroup>

      <SettingsGroup title="Privacy"><a className="hydros-settings-row hydros-settings-row--link" href="/settings"><Icon><GearIcon /></Icon><span className="hydros-settings-row__name">Data &amp; privacy</span><Chevron /></a><a className="hydros-settings-row hydros-settings-row--link" href="/settings"><Icon><DropIcon /></Icon><span className="hydros-settings-row__name">Backup &amp; sync</span><Chevron /></a></SettingsGroup>

      <SettingsGroup title="About"><div className="hydros-settings-row hydros-settings-row--static"><Icon><MoreIcon /></Icon><span className="hydros-settings-row__name">App version</span><span className="hydros-settings-row__value">1.0.0</span></div><a className="hydros-settings-row hydros-settings-row--link" href={FEEDBACK_EMAIL ? `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Hydros help')}` : '/'}><Icon><LeafIcon /></Icon><span className="hydros-settings-row__name">Help &amp; support</span><Chevron /></a></SettingsGroup>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="hydros-settings-group" aria-label={title}><h2>{title}</h2><div className="hydros-settings-list">{children}</div></section>;
}
