import { useState } from 'react';
import type { Nav } from '../app/App';
import { drinkKinds, id, kindCaffeine, type DrinkKind } from '../core/drinks';
import { putDrink } from '../data/store';
import { ClockIcon, MinusIcon, PlusIcon, iconForKind } from '../app/icons';
import { ScreenHeader } from '../app/ui';

const amounts = [8, 12, 16, 20];

export default function AddPage({ nav }: { nav: Nav }) {
  const [kind, setKind] = useState<DrinkKind>('water');
  const [amount, setAmount] = useState(12);
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const save = async () => {
    await putDrink({ id: id(), kind, amountOz: amount, caffeineMg: kindCaffeine(kind), loggedAt: new Date(loggedAt).toISOString(), createdAt: new Date().toISOString() });
    nav.swap({ name: 'today' });
  };
  return <div className="hydros-add"><ScreenHeader title="Add Drink" onBack={nav.back} /><div className="hydros-add__image" /><div className="drink-types">{drinkKinds.map((item) => <button type="button" key={item.id} className={kind === item.id ? 'is-selected' : ''} onClick={() => setKind(item.id)}>{iconForKind(item.id, { size: 27 })}<span>{item.label}</span></button>)}</div><div className="amount-picker"><button type="button" aria-label="Decrease amount" onClick={() => setAmount((value) => Math.max(1, value - 1))}><MinusIcon /></button><strong>{amount}<small> oz</small></strong><button type="button" aria-label="Increase amount" onClick={() => setAmount((value) => value + 1)}><PlusIcon /></button></div><div className="amount-presets">{amounts.map((value) => <button key={value} type="button" className={amount === value ? 'is-selected' : ''} onClick={() => setAmount(value)}>{value} oz</button>)}</div><label className="hydros-time"><ClockIcon size={20} /><span>Time</span><input type="datetime-local" value={loggedAt} onChange={(event) => setLoggedAt(event.target.value)} /></label><button type="button" className="hydros-save" onClick={() => void save()}>Save Drink</button></div>;
}
