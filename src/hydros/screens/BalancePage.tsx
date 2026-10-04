import { useMemo, useState } from 'react';
import type { BalanceDetailId, Nav } from '../app/App';
import { useDrinks, useSettings } from '../app/state';
import { caffeine, sameDay, totalOz, volumeLabel } from '../core/drinks';
import { BalanceIcon, BoltIcon, CupIcon, DropIcon, PlusIcon, WaveIcon } from '../app/icons';
import { ScreenHeader, Segmented } from '../app/ui';

type BalanceTab = 'Hydration' | 'Caffeine' | 'Electrolytes' | 'Routine';
export default function BalancePage({ nav }: { nav: Nav }) {
  const [tab, setTab] = useState<BalanceTab>('Hydration');
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const unit = settings.unit ?? 'oz';
  const today = useMemo(() => drinks.filter((drink) => sameDay(drink)), [drinks]);
  const water = totalOz(today);
  const caffeineMg = caffeine(today);
  const electrolytes = today.filter((drink) => drink.kind === 'electrolyte').length;
  const items: { id: BalanceDetailId; icon: React.ReactNode; title: string; value: string; detail: string }[] = tab === 'Caffeine' ? [{ id: 'caffeine', icon: <CupIcon />, title: 'Caffeine', value: `${caffeineMg} mg`, detail: caffeineMg ? 'From today’s drinks' : 'None logged today' }, { id: 'dailyBalance', icon: <DropIcon />, title: 'Hydration', value: volumeLabel(water, unit), detail: 'Water and other drinks' }] : tab === 'Electrolytes' ? [{ id: 'electrolytes', icon: <BoltIcon />, title: 'Electrolytes', value: electrolytes ? `${electrolytes} logged` : 'None logged', detail: electrolytes ? `${electrolytes} drink${electrolytes === 1 ? '' : 's'} today` : 'Add a drink to see it here' }] : tab === 'Routine' ? [{ id: 'rhythm', icon: <WaveIcon />, title: 'Daily Rhythm', value: today.length ? `${today.length} logged` : 'None logged', detail: today.length ? 'Today’s entries' : 'None logged today' }] : [{ id: 'dailyBalance', icon: <DropIcon />, title: 'Daily Balance', value: volumeLabel(water, unit), detail: water ? 'A clear view of today' : 'Nothing here yet' }, { id: 'caffeine', icon: <CupIcon />, title: 'Caffeine', value: `${caffeineMg} mg`, detail: caffeineMg ? 'From today’s drinks' : 'None logged today' }, { id: 'electrolytes', icon: <BoltIcon />, title: 'Electrolytes', value: electrolytes ? `${electrolytes} logged` : 'None logged', detail: electrolytes ? 'Based on today’s entries' : 'Nothing logged today' }, { id: 'rhythm', icon: <WaveIcon />, title: 'Daily Rhythm', value: today.length ? `${today.length} logged` : 'None logged', detail: today.length ? 'Today’s entries' : 'None logged today' }, { id: 'support', icon: <BalanceIcon />, title: 'Support Tools', value: settings.reminders ? 'Reminders on' : 'Reminders off', detail: settings.reminders ? `Every ${Math.round((settings.reminderIntervalMinutes ?? 120) / 60)} hours` : 'Set a reminder rhythm' }];
  return <div className="hydros-screen"><ScreenHeader title="Balance" onBack={nav.back} /><Segmented items={['Hydration', 'Caffeine', 'Electrolytes', 'Routine'] as const} selected={tab} onSelect={setTab} /><div className="balance-list">{items.map((item) => <button type="button" className="balance-row" key={item.id} onClick={() => nav.go({ name: 'balanceDetail', id: item.id })}><span className="balance-row__icon">{item.icon}</span><span className="balance-row__words"><strong>{item.title}</strong><b>{item.value}</b><small>{item.detail}</small></span><span className="balance-row__chevron" aria-hidden="true">›</span></button>)}</div><button type="button" className="hydros-add-float" onClick={() => nav.go({ name: 'add' })}><PlusIcon size={22} /> Add drink</button></div>;
}
