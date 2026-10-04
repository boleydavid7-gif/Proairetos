import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { useSettings, updateSettings } from '../app/state';
import { recommendedGoalOz, type HydrosActivity } from '../core/drinks';
import { ScreenHeader } from '../app/ui';

const choices = [64, 72, 80, 96];

export default function SettingsPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const [amount, setAmount] = useState(() => String(settings.goalOz));
  const [weight, setWeight] = useState(() => settings.weightLb ? String(settings.weightLb) : '');
  const [height, setHeight] = useState(() => settings.heightIn ? String(settings.heightIn) : '');
  const [activity, setActivity] = useState<HydrosActivity>(settings.activity ?? 'moderate');
  const recommendation = useMemo(() => recommendedGoalOz({ weightLb: Number(weight), heightIn: Number(height), activity }), [weight, height, activity]);
  const save = () => {
    const parsed = Number(amount);
    const parsedWeight = Number(weight);
    const parsedHeight = Number(height);
    updateSettings({
      goalOz: Number.isFinite(parsed) ? Math.max(1, Math.min(300, Math.round(parsed))) : 80,
      weightLb: Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
      heightIn: Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : undefined,
      activity,
    });
    nav.back();
  };
  return <div className="hydros-screen hydros-settings"><ScreenHeader title="Settings" onBack={nav.back} /><section className="hydros-settings-card"><h2>Daily amount</h2><div className="hydros-amount-input"><input aria-label="Daily amount in ounces" type="number" inputMode="numeric" min="1" max="300" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>oz</span></div><div className="hydros-choice-row">{choices.map((choice) => <button type="button" key={choice} className={Number(amount) === choice ? 'is-selected' : ''} onClick={() => setAmount(String(choice))}>{choice} oz</button>)}</div><div className="hydros-settings-recommendation"><div><span>Recommended</span><strong>{recommendation ? `${recommendation} oz` : 'Set weight and height'}</strong></div>{recommendation ? <button type="button" onClick={() => setAmount(String(recommendation))}>Use</button> : null}</div></section><section className="hydros-settings-card"><h2>Your measures</h2><div className="hydros-field-grid"><label><span>Weight</span><div><input type="number" inputMode="decimal" min="1" max="700" value={weight} onChange={(event) => setWeight(event.target.value)} /><b>lb</b></div></label><label><span>Height</span><div><input type="number" inputMode="decimal" min="1" max="100" value={height} onChange={(event) => setHeight(event.target.value)} /><b>in</b></div></label></div><div className="hydros-activity"><span>Activity</span><div>{(['low', 'moderate', 'high'] as HydrosActivity[]).map((level) => <button type="button" key={level} className={activity === level ? 'is-selected' : ''} onClick={() => setActivity(level)}>{level[0].toUpperCase() + level.slice(1)}</button>)}</div></div><button type="button" className="hydros-save" onClick={save}>Save</button></section></div>;
}
