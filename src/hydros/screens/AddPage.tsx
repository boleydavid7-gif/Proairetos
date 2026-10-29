import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { defaultDrinkProfiles, drinkKinds, formatVolume, id, unitToOunces, type HydrosDrinkProfile, type HydrosUnit } from '../core/drinks';
import { logDrink } from '../app/log';
import { MinusIcon, PlusIcon, iconForKind } from '../app/icons';
import { ScreenHeader } from '../app/ui';
import { updateSettings, useSettings } from '../app/state';
import IconButton from '../../components/ui/IconButton';

type Props = { nav: Nav; profileId?: string; custom?: boolean };

export default function AddPage({ nav, profileId, custom = false }: Props) {
  const settings = useSettings();
  const unit = settings.unit ?? 'oz';
  const profiles = settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState(profileId ?? 'water');
  const [amount, setAmount] = useState(() => unit === 'oz' ? 12 : unit === 'ml' ? 355 : .35);
  const [name, setName] = useState('');
  const [caffeineMg, setCaffeineMg] = useState('0');
  const [electrolytesMg, setElectrolytesMg] = useState('0');
  const [sugarG, setSugarG] = useState('0');
  const [hydrationPercent, setHydrationPercent] = useState('100');
  useEffect(() => { if (profileId) setSelectedProfileId(profileId); }, [profileId]);
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0], [profiles, selectedProfileId]);
  const selectedBaseProfile = (item: typeof drinkKinds[number]): HydrosDrinkProfile => profiles.find((profile) => profile.id === item.id) ?? {
    id: item.id,
    kind: item.id,
    label: item.label,
    caffeineMg: item.caffeineMg,
    electrolytesMg: 0,
    sugarG: 0,
    hydrationCoefficient: 1,
  };
  const save = async () => {
    await logDrink({ profileId: selectedProfile.id, amountOz: unitToOunces(amount, unit) }, profiles, unit);
    nav.swap({ name: 'today' });
  };
  const saveCustom = async () => {
    const label = name.trim();
    const caffeine = Math.max(0, Number(caffeineMg) || 0);
    const electrolytes = Math.max(0, Number(electrolytesMg) || 0);
    const sugar = Math.max(0, Number(sugarG) || 0);
    const hydrationCoefficient = Math.max(0, Math.min(1, (Number(hydrationPercent) || 0) / 100));
    if (!label || amount <= 0) return;
    const profile: HydrosDrinkProfile = { id: `custom-${id()}`, kind: 'other', label: label.slice(0, 40), caffeineMg: caffeine, electrolytesMg: electrolytes, sugarG: sugar, hydrationCoefficient };
    const nextProfiles = [...profiles, profile];
    updateSettings({ drinkProfiles: nextProfiles });
    await logDrink({ profileId: profile.id, amountOz: unitToOunces(amount, unit) }, nextProfiles, unit);
    nav.swap({ name: 'today' });
  };
  const step = unit === 'oz' ? 1 : unit === 'ml' ? 50 : .1;
  const changeAmount = (direction: number) => setAmount((value) => Math.max(step, Math.round((value + direction * step) * 100) / 100));
  return (
    <div className="hydros-add">
      <div className="hydros-add__stage">
        <ScreenHeader title="Add a drink" onBack={nav.back} />
        {custom ? (
          <div className="hydros-custom-fields">
            <label><span>Name</span><input autoFocus value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
            <details className="hydros-custom-details">
              <summary>Details (optional)</summary>
              <div className="hydros-custom-details__fields">
                <label><span>Caffeine</span><input type="number" min="0" step="1" inputMode="numeric" value={caffeineMg} onChange={(event) => setCaffeineMg(event.target.value)} /><b>mg</b></label>
                <label><span>Electrolytes</span><input type="number" min="0" step="1" inputMode="numeric" value={electrolytesMg} onChange={(event) => setElectrolytesMg(event.target.value)} /><b>mg</b></label>
                <label><span>Sugar</span><input type="number" min="0" step="1" inputMode="decimal" value={sugarG} onChange={(event) => setSugarG(event.target.value)} /><b>g</b></label>
                <label><span>Counted</span><input type="number" min="0" max="100" step="1" inputMode="decimal" value={hydrationPercent} onChange={(event) => setHydrationPercent(event.target.value)} /><b>%</b></label>
              </div>
            </details>
          </div>
        ) : (
          <div className="drink-types">
            {drinkKinds.map((item) => (
              <button type="button" key={item.id} className={selectedProfile.kind === item.id && selectedProfile.id === selectedProfileId ? 'is-selected' : ''} onClick={() => setSelectedProfileId(item.id)}>
                {iconForKind(item.id, { size: 27 })}
                <span>{selectedBaseProfile(item).label}</span>
              </button>
            ))}
            <button type="button" className="hydros-custom-drink" onClick={() => nav.go({ name: 'add', custom: true })}>
              <PlusIcon size={28} />
              <span>Custom drink</span>
            </button>
          </div>
        )}
        <div className="amount-picker">
          <IconButton size="md" label="Decrease amount" onClick={() => changeAmount(-1)}><MinusIcon /></IconButton>
          <strong>{formatVolume(amount, unit as HydrosUnit)}<small> {unit}</small></strong>
          <IconButton size="md" label="Increase amount" onClick={() => changeAmount(1)}><PlusIcon /></IconButton>
        </div>
        <button type="button" className="hydros-save" disabled={custom && !name.trim()} onClick={() => void (custom ? saveCustom() : save())}>Save</button>
      </div>
    </div>
  );
}
