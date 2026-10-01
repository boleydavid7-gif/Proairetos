import { useState } from 'react';
import { lifeService } from '../../app/services';
import { describeRule, repeatPresets, type RepeatRule } from '../../core/life-items/repeat';
import type { LifeItem } from '../../core/life-items/types';
import { weekdayNames } from '../schedule/format';

const same = (a?: RepeatRule, b?: RepeatRule) => JSON.stringify(a) === JSON.stringify(b);

/** Turns a timed item into a routine. Missed times roll forward; nothing piles up. */
export default function RepeatSection({ item }: { item: LifeItem }) {
  const [custom, setCustom] = useState(false);
  const [days, setDays] = useState<number[]>(item.repeat?.kind === 'WEEKDAYS' ? item.repeat.days : []);
  if (!item.scheduledAt || item.status === 'DONE' || item.status === 'LET_GO') return null;

  const isPreset = repeatPresets.some((preset) => same(preset.rule, item.repeat));
  const set = (rule: RepeatRule | undefined) => lifeService.setRepeat(item.id, rule);

  return (
    <section className="sheet__section" aria-label="Repeats">
      <p className="sheet__label">Repeats</p>
      <div className="chip-row" role="group" aria-label="How it repeats">
        <button type="button" className="chip" aria-pressed={!item.repeat} onClick={() => set(undefined)}>
          No
        </button>
        {repeatPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="chip"
            aria-pressed={same(preset.rule, item.repeat)}
            onClick={() => {
              setCustom(false);
              set(preset.rule);
            }}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={custom || Boolean(item.repeat && !isPreset)}
          onClick={() => setCustom(true)}
        >
          {item.repeat && !isPreset ? describeRule(item.repeat) : 'Chosen days'}
        </button>
      </div>
      {custom && (
        <div className="chip-row" role="group" aria-label="Days of the week">
          {weekdayNames.map((name, index) => (
            <button
              key={name}
              type="button"
              className="chip chip--day"
              aria-pressed={days.includes(index)}
              aria-label={name}
              onClick={() => {
                const next = days.includes(index) ? days.filter((d) => d !== index) : [...days, index].sort();
                setDays(next);
                if (next.length > 0) set({ kind: 'WEEKDAYS', days: next });
              }}
            >
              {name.slice(0, 2)}
            </button>
          ))}
        </div>
      )}
      {item.repeat && <p className="sheet__hint">If a time passes, it simply shows at the next one.</p>}
    </section>
  );
}
