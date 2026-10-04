import { useState } from 'react';
import type { Nav } from '../app/App';
import { drinkKinds, formatVolume, id, kindCaffeine, unitToOunces, type DrinkKind, type HydrosUnit } from '../core/drinks';
import { putDrink } from '../data/store';
import { ClockIcon, MinusIcon, PlusIcon, iconForKind } from '../app/icons';
import { ScreenHeader } from '../app/ui';
import { useSettings } from '../app/state';

export default function AddPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const unit = settings.unit ?? 'oz';
  const [kind, setKind] = useState<DrinkKind>('water');
  const [amount, setAmount] = useState(12);
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const save = async () => {
    await putDrink({ id: id(), kind, amountOz: amount, caffeineMg: kindCaffeine(kind), loggedAt: new Date(loggedAt).toISOString(), createdAt: new Date().toISOString() });
    nav.swap({ name: 'today' });
  };
  const step = unit === 'oz' ? 1 : unit === 'ml' ? unitToOunces(50, unit) : unitToOunces(.1, unit);
  const changeAmount = (direction: number) => setAmount((value) => Math.max(step, Math.round((value + direction * step) * 100) / 100));
  return (
    <div className="hydros-add">
      <div className="hydros-add__stage">
        <ScreenHeader title="Add Drink" onBack={nav.back} />
        <div className="drink-types">
          {drinkKinds.map((item) => (
            <button type="button" key={item.id} className={kind === item.id ? 'is-selected' : ''} onClick={() => setKind(item.id)}>
              {iconForKind(item.id, { size: 27 })}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="amount-picker">
          <button type="button" aria-label="Decrease amount" onClick={() => changeAmount(-1)}><MinusIcon /></button>
          <strong>{formatVolume(amount, unit as HydrosUnit)}<small> {unit}</small></strong>
          <button type="button" aria-label="Increase amount" onClick={() => changeAmount(1)}><PlusIcon /></button>
        </div>
        <label className="hydros-time"><ClockIcon size={20} /><span>Time</span><input type="datetime-local" value={loggedAt} onChange={(event) => setLoggedAt(event.target.value)} /></label>
        <button type="button" className="hydros-save" onClick={() => void save()}>Save Drink</button>
      </div>
    </div>
  );
}
