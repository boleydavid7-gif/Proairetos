import { useState } from 'react';
import type { Nav } from '../app/App';
import { drinkKinds, formatVolume, id, kindCaffeine, unitToOunces, type DrinkKind, type HydrosUnit } from '../core/drinks';
import { putDrink } from '../data/store';
import { CloseIcon, MinusIcon, PlusIcon, iconForKind } from '../app/icons';
import { ScreenHeader } from '../app/ui';
import { useSettings } from '../app/state';

const otherDrinkKinds = [
  { id: 'energy', label: 'Energy drink', caffeineMg: 160 },
  { id: 'sports', label: 'Sports drink', caffeineMg: 0 },
  { id: 'juice', label: 'Juice', caffeineMg: 0 },
  { id: 'soda', label: 'Soda', caffeineMg: 39 },
  { id: 'other', label: 'Other', caffeineMg: 0 },
] as const;

export default function AddPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const unit = settings.unit ?? 'oz';
  const [kind, setKind] = useState<DrinkKind>('water');
  const [amount, setAmount] = useState(12);
  const [otherKind, setOtherKind] = useState<(typeof otherDrinkKinds)[number]['id']>('energy');
  const [otherMenuOpen, setOtherMenuOpen] = useState(false);
  const selectedOther = otherDrinkKinds.find((item) => item.id === otherKind) ?? otherDrinkKinds[0];
  const save = async () => {
    const now = new Date().toISOString();
    const caffeineMg = kind === 'other' ? otherDrinkKinds.find((item) => item.id === otherKind)?.caffeineMg ?? 0 : kindCaffeine(kind);
    await putDrink({ id: id(), kind, amountOz: amount, caffeineMg, loggedAt: now, createdAt: now });
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
            <button type="button" key={item.id} className={kind === item.id ? 'is-selected' : ''} onClick={() => { setKind(item.id); if (item.id === 'other') setOtherMenuOpen(true); }}>
              {iconForKind(item.id, { size: 27 })}
              <span>{item.id === 'other' && otherKind !== 'other' ? selectedOther.label : item.label}</span>
            </button>
          ))}
        </div>
        {kind === 'other' && otherMenuOpen ? <div className="hydros-other-menu" role="dialog" aria-label="Other drink types">
          <div className="hydros-other-menu__head"><strong>Other drink</strong><button type="button" aria-label="Close other drink menu" onClick={() => setOtherMenuOpen(false)}><CloseIcon size={18} /></button></div>
          <div className="hydros-other-menu__options">{otherDrinkKinds.map((item) => <button type="button" key={item.id} className={otherKind === item.id ? 'is-selected' : ''} onClick={() => { setOtherKind(item.id); setOtherMenuOpen(false); }}>{item.label}</button>)}</div>
        </div> : null}
        <div className="amount-picker">
          <button type="button" aria-label="Decrease amount" onClick={() => changeAmount(-1)}><MinusIcon /></button>
          <strong>{formatVolume(amount, unit as HydrosUnit)}<small> {unit}</small></strong>
          <button type="button" aria-label="Increase amount" onClick={() => changeAmount(1)}><PlusIcon /></button>
        </div>
        <button type="button" className="hydros-save" onClick={() => void save()}>Save Drink</button>
      </div>
    </div>
  );
}
