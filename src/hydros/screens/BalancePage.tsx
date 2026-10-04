import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { useDrinks } from '../app/state';
import { caffeine, sameDay, totalOz } from '../core/drinks';
import { BalanceIcon, BoltIcon, CupIcon, DropIcon, PlusIcon, WaveIcon } from '../app/icons';
import { ScreenHeader, Segmented } from '../app/ui';

type BalanceTab = 'Hydration' | 'Caffeine' | 'Electrolytes' | 'Routine';
export default function BalancePage({ nav }: { nav: Nav }) {
  const [tab, setTab] = useState<BalanceTab>('Hydration');
  const drinks = useDrinks() ?? [];
  const today = useMemo(() => drinks.filter((drink) => sameDay(drink)), [drinks]);
  const water = totalOz(today);
  const caffeineMg = caffeine(today);
  const electrolytes = today.filter((drink) => drink.kind === 'electrolyte').length;
  const items = tab === 'Caffeine' ? [{ icon: <CupIcon />, title: 'Caffeine', value: `${caffeineMg} mg`, detail: caffeineMg ? 'From today’s drinks' : 'None logged today' }, { icon: <DropIcon />, title: 'Hydration', value: `${water} oz`, detail: 'Water and other drinks' }] : tab === 'Electrolytes' ? [{ icon: <BoltIcon />, title: 'Electrolytes', value: electrolytes ? 'Good' : 'None logged', detail: electrolytes ? `${electrolytes} drink${electrolytes === 1 ? '' : 's'} today` : 'Add a drink to see it here' }] : tab === 'Routine' ? [{ icon: <WaveIcon />, title: 'Daily Rhythm', value: today.length ? 'Consistent' : 'Open', detail: today.length ? 'Similar to your usual pattern' : 'Start with one drink' }] : [{ icon: <DropIcon />, title: 'Daily Balance', value: `${water} oz`, detail: water ? 'A clear view of today' : 'Nothing here yet' }, { icon: <CupIcon />, title: 'Caffeine', value: `${caffeineMg} mg`, detail: caffeineMg ? 'From today’s drinks' : 'None logged today' }, { icon: <BoltIcon />, title: 'Electrolytes', value: electrolytes ? 'Good' : 'Open', detail: electrolytes ? 'Based on today’s entries' : 'Nothing logged today' }, { icon: <WaveIcon />, title: 'Daily Rhythm', value: today.length ? 'Steady' : 'Open', detail: today.length ? 'Your drinks, across the day' : 'Nothing here yet' }, { icon: <BalanceIcon />, title: 'Support Tools', value: 'Reminders', detail: 'Keep your rhythm visible' }];
  return <div className="hydros-screen"><ScreenHeader title="Balance" onBack={nav.back} /><Segmented items={['Hydration', 'Caffeine', 'Electrolytes', 'Routine'] as const} selected={tab} onSelect={setTab} /><div className="balance-list">{items.map((item) => <button type="button" className="balance-row" key={item.title}><span className="balance-row__icon">{item.icon}</span><span className="balance-row__words"><strong>{item.title}</strong><b>{item.value}</b><small>{item.detail}</small></span><span className="balance-row__chevron">›</span></button>)}</div><button type="button" className="hydros-add-float" onClick={() => nav.go({ name: 'add' })}><PlusIcon size={22} /> Add drink</button></div>;
}
