import { useSyncExternalStore } from 'react';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { energyFor, setEnergy, subscribePreferences, type Energy } from '../../data/storage/preferences';

const options: { id: Energy; label: string }[] = [
  { id: 'full', label: 'Plenty' },
  { id: 'some', label: 'Some' },
  { id: 'low', label: 'Low' },
];

export function useEnergy(date: string): Energy | undefined {
  return useSyncExternalStore(subscribePreferences, () => energyFor(date));
}

/** The person's own word for their energy today, for today only, and never guessed. */
export default function EnergyChoice({ date }: { date: string }) {
  const energy = useEnergy(date);
  const shows = useTodayParts();
  if (!shows('energy')) return null;
  return (
    <div className="energy-choice">
      <span className="energy-choice__label">Energy today</span>
      <div className="chip-row" role="group" aria-label="Energy today">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="chip chip--small"
            aria-pressed={energy === option.id}
            onClick={() => setEnergy(date, energy === option.id ? undefined : option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
