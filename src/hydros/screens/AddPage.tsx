import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { defaultDrinkProfiles, drinkKinds, formatVolume, unitToOunces, type HydrosDrinkProfile, type HydrosUnit } from '../core/drinks';
import { logDrink } from '../app/log';
import { MinusIcon, PlusIcon, iconForKind } from '../app/icons';
import { ScreenHeader } from '../app/ui';
import { useSettings } from '../app/state';

export default function AddPage({ nav, profileId }: { nav: Nav; profileId?: string }) {
  const settings = useSettings();
  const unit = settings.unit ?? 'oz';
  const profiles = settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState(profileId ?? 'water');
  const [amount, setAmount] = useState(() => unit === 'oz' ? 12 : unit === 'ml' ? 355 : .35);
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
  const step = unit === 'oz' ? 1 : unit === 'ml' ? 50 : .1;
  const changeAmount = (direction: number) => setAmount((value) => Math.max(step, Math.round((value + direction * step) * 100) / 100));
  return (
    <div className="hydros-add">
      <div className="hydros-add__stage">
        <ScreenHeader title="Add a drink" onBack={nav.back} />
        <div className="drink-types">
          {drinkKinds.map((item) => (
            <button type="button" key={item.id} className={selectedProfile.kind === item.id && (item.id !== 'other' || selectedProfile.id === selectedProfileId) ? 'is-selected' : ''} onClick={() => item.id === 'other' ? nav.go({ name: 'drinkTypes', returnTo: 'add' }) : setSelectedProfileId(item.id)}>
              {iconForKind(item.id, { size: 27 })}
              <span>{item.id === 'other' && selectedProfile.kind === 'other' ? selectedProfile.label : selectedBaseProfile(item).label}</span>
            </button>
          ))}
        </div>
        <div className="amount-picker">
          <button type="button" aria-label="Decrease amount" onClick={() => changeAmount(-1)}><MinusIcon /></button>
          <strong>{formatVolume(amount, unit as HydrosUnit)}<small> {unit}</small></strong>
          <button type="button" aria-label="Increase amount" onClick={() => changeAmount(1)}><PlusIcon /></button>
        </div>
        <button type="button" className="hydros-save" onClick={() => void save()}>Save</button>
      </div>
    </div>
  );
}
