import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { useDrinks, useSettings } from '../app/state';
import { defaultDrinkProfiles, effectiveGoalOz, formatVolume, hourLabel, hydrationEquivalentOz, hydrationOz, localDate, localDateTimeInput, monthDates, startOfWeek, unitToOunces, volumeLabel, weekDates, weekNumber, type Drink, type HydrosDrinkProfile, type HydrosUnit } from '../core/drinks';
import { removeDrink, putDrink } from '../data/store';
import { BoltIcon, CloseIcon, CupIcon, DropIcon, PencilIcon } from '../app/icons';
import { ScreenHeader, Segmented } from '../app/ui';

type Span = 'Day' | 'Month';
type DrinkDraft = { profileId: string; amount: string; caffeineMg: string; electrolytesMg: string; sugarG: string; loggedAt: string };

export default function FlowPage({ nav }: { nav: Nav }) {
  const drinks = useDrinks() ?? [];
  const settings = useSettings();
  const [span, setSpan] = useState<Span>('Day');
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek());
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<DrinkDraft>();
  const range = span === 'Day' ? weekDates(weekCursor) : monthDates(monthCursor);
  const unit = settings.unit ?? 'oz';
  const profiles = settings.drinkProfiles?.length ? settings.drinkProfiles : defaultDrinkProfiles();
  const values = useMemo(() => range.map((day) => hydrationOz(drinks.filter((drink) => localDate(new Date(drink.loggedAt)) === day), profiles)), [drinks, profiles, range.join(',')]);
  const periodDrinks = useMemo(() => drinks.filter((drink) => range.includes(localDate(new Date(drink.loggedAt)))), [drinks, range.join(',')]);
  const recent = drinks.slice(0, 5);
  const max = Math.max(settings.usualMaxOz, effectiveGoalOz(settings), ...values, 1);
  const periodTitle = span === 'Day'
    ? `Week ${weekNumber(weekCursor)} · ${weekCursor.getFullYear()}`
    : monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const movePeriod = (direction: number) => {
    if (span === 'Day') {
      const next = new Date(weekCursor);
      next.setDate(next.getDate() + direction * 7);
      setWeekCursor(next);
      return;
    }
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + direction, 1));
  };

  const startEdit = (drink: Drink) => {
    const profile = profileForDrink(drink, profiles);
    setEditingId(drink.id);
    setDraft({ profileId: profile.id, amount: formatVolume(drink.amountOz, unit), caffeineMg: String(drink.caffeineMg ?? profile.caffeineMg), electrolytesMg: String(drink.electrolytesMg ?? profile.electrolytesMg), sugarG: String(drink.sugarG ?? profile.sugarG), loggedAt: localDateTimeInput(new Date(drink.loggedAt)) });
  };
  const cancelEdit = () => { setEditingId(undefined); setDraft(undefined); };
  const saveEdit = async (drink: Drink) => {
    if (!draft) return;
    const profile = profiles.find((item) => item.id === draft.profileId) ?? profileForDrink(drink, profiles);
    const parsedDate = new Date(draft.loggedAt);
    const amount = Number(draft.amount);
    await putDrink({ ...drink, kind: profile.kind, profileId: profile.id, label: profile.label, amountOz: Number.isFinite(amount) && amount > 0 ? unitToOunces(amount, unit) : drink.amountOz, caffeineMg: nonNegative(draft.caffeineMg, profile.caffeineMg), electrolytesMg: nonNegative(draft.electrolytesMg, profile.electrolytesMg), sugarG: nonNegative(draft.sugarG, profile.sugarG), loggedAt: Number.isNaN(parsedDate.getTime()) ? drink.loggedAt : parsedDate.toISOString() });
    cancelEdit();
  };

  return <div className="hydros-screen hydros-flow">
    <ScreenHeader title="Your Flow" onBack={nav.back} />
    <Segmented items={['Day', 'Month'] as const} selected={span} onSelect={setSpan} />
    <div className="flow-period" aria-label={`${span} period navigation`}>
      <button type="button" className="flow-period__button" aria-label="Previous period" onClick={() => movePeriod(-1)}>‹</button>
      <strong>{periodTitle}</strong>
      <button type="button" className="flow-period__button" aria-label="Next period" onClick={() => movePeriod(1)}>›</button>
    </div>
    <div className="flow-chart-card">
      {span === 'Day'
        ? <DailyChart range={range} values={values} max={max} unit={unit} hasEntries={periodDrinks.length > 0} />
        : <MonthlyLineChart range={range} values={values} max={max} unit={unit} hasEntries={periodDrinks.length > 0} />}
      <div className="flow-legend"><span><i className="is-cyan" /> Net intake</span><span><i className="is-dash" /> {periodDrinks.length ? `Your ${unit} range` : 'Set amount'}</span></div>
    </div>
    <section className="recent-entries"><div className="hydros-section-title"><h2>Recent entries</h2>{recent.length ? <span>{`Last ${recent.length}`}</span> : null}</div>{recent.length ? recent.map((drink) => <RecentEntry key={drink.id} drink={drink} profiles={profiles} unit={unit} editing={editingId === drink.id} draft={editingId === drink.id ? draft : undefined} onEdit={() => startEdit(drink)} onCancel={cancelEdit} onDelete={async () => { await removeDrink(drink.id); cancelEdit(); }} onSave={() => void saveEdit(drink)} onDraftChange={setDraft} />) : <p className="pattern-empty">No drinks logged yet.</p>}</section>
  </div>;
}

function DailyChart({ range, values, max, unit, hasEntries }: { range: string[]; values: number[]; max: number; unit: HydrosUnit; hasEntries: boolean }) {
  return <div className={`flow-chart${hasEntries ? '' : ' is-empty'}`} aria-label="Sunday through Saturday hydration flow chart"><div className="flow-chart__grid"><span>{formatVolume(max, unit)} {unit}</span><span>{formatVolume(max * .75, unit)} {unit}</span><span>{formatVolume(max * .5, unit)} {unit}</span><span>0</span></div><div className="flow-chart__bars">{values.map((value, index) => <div className="flow-chart__bar-wrap" key={`${range[index]}-${index}`}><div className="flow-chart__bar" style={{ height: `${Math.max(value ? 7 : 2, (value / max) * 100)}%` }} /><small>{new Date(`${range[index]}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>)}</div></div>;
}

function MonthlyLineChart({ range, values, max, unit, hasEntries }: { range: string[]; values: number[]; max: number; unit: HydrosUnit; hasEntries: boolean }) {
  const width = 360;
  const height = 220;
  const left = 38;
  const right = 8;
  const top = 13;
  const bottom = 29;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = values.map((value, index) => `${left + (range.length === 1 ? plotWidth / 2 : (index / (range.length - 1)) * plotWidth)},${top + plotHeight - (value / max) * plotHeight}`).join(' ');
  const labelIndexes = Array.from(new Set([0, Math.floor((range.length - 1) / 2), range.length - 1]));
  return <div className={`flow-line-chart${hasEntries ? '' : ' is-empty'}`} aria-label={`Monthly hydration intake from day 1 to day ${range.length}`}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
      {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line className="flow-line-chart__grid" x1={left} x2={width - right} y1={top + plotHeight * (1 - fraction)} y2={top + plotHeight * (1 - fraction)} /><text className="flow-line-chart__value" x={left - 7} y={top + plotHeight * (1 - fraction) + 3} textAnchor="end">{formatVolume(max * fraction, unit)}</text></g>)}
      <polyline className="flow-line-chart__line" points={points} />
      {values.map((value, index) => <circle className="flow-line-chart__point" key={range[index]} cx={left + (range.length === 1 ? plotWidth / 2 : (index / (range.length - 1)) * plotWidth)} cy={top + plotHeight - (value / max) * plotHeight} r="2.5" />)}
      {labelIndexes.map((index) => <text className="flow-line-chart__axis" key={range[index]} x={left + (range.length === 1 ? plotWidth / 2 : (index / (range.length - 1)) * plotWidth)} y={height - 7} textAnchor="middle">{index + 1}</text>)}
    </svg>
  </div>;
}

function RecentEntry({ drink, profiles, unit, editing, draft, onEdit, onCancel, onDelete, onSave, onDraftChange }: { drink: Drink; profiles: HydrosDrinkProfile[]; unit: HydrosUnit; editing: boolean; draft?: DrinkDraft; onEdit: () => void; onCancel: () => void; onDelete: () => void; onSave: () => void; onDraftChange: (draft: DrinkDraft) => void }) {
  const profile = profileForDrink(drink, profiles);
  const icon = profile.kind === 'coffee' ? <CupIcon /> : profile.kind === 'electrolyte' ? <BoltIcon /> : <DropIcon />;
  return <article className="recent-entry"><div className="recent-entry__summary"><span className="recent-entry__icon">{icon}</span><span className="recent-entry__words"><strong>{drink.label ?? profile.label}</strong><small>{volumeLabel(drink.amountOz, unit)} logged · {hourLabel(drink.loggedAt)}</small><em>{volumeLabel(hydrationEquivalentOz(drink, profiles), unit)} credited · {drink.caffeineMg ?? profile.caffeineMg} mg caffeine{drink.electrolytesMg ? ` · ${drink.electrolytesMg} mg electrolytes` : ''}</em></span><button type="button" className="recent-entry__edit" aria-label={`Edit ${drink.label ?? profile.label}`} onClick={onEdit}><PencilIcon size={18} /></button></div>{editing && draft ? <div className="recent-entry__editor"><label><span>Type</span><select value={draft.profileId} onChange={(event) => onDraftChange({ ...draft, profileId: event.target.value })}>{profiles.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label><span>Amount</span><input type="number" min=".1" step={unit === 'L' ? '.1' : '1'} value={draft.amount} onChange={(event) => onDraftChange({ ...draft, amount: event.target.value })} /><b>{unit}</b></label><label><span>Caffeine</span><input type="number" min="0" step="1" value={draft.caffeineMg} onChange={(event) => onDraftChange({ ...draft, caffeineMg: event.target.value })} /><b>mg</b></label><label><span>Electrolytes</span><input type="number" min="0" step="1" value={draft.electrolytesMg} onChange={(event) => onDraftChange({ ...draft, electrolytesMg: event.target.value })} /><b>mg</b></label><label><span>Sugar</span><input type="number" min="0" step="1" value={draft.sugarG} onChange={(event) => onDraftChange({ ...draft, sugarG: event.target.value })} /><b>g</b></label><label><span>When</span><input type="datetime-local" value={draft.loggedAt} onChange={(event) => onDraftChange({ ...draft, loggedAt: event.target.value })} /></label><div className="recent-entry__actions"><button type="button" className="hydros-save" onClick={onSave}>Save</button><button type="button" className="recent-entry__cancel" onClick={onCancel}><CloseIcon size={17} /> Cancel</button><button type="button" className="recent-entry__delete" onClick={onDelete}>Delete</button></div></div> : null}</article>;
}

function profileForDrink(drink: Drink, profiles: HydrosDrinkProfile[]): HydrosDrinkProfile {
  return profiles.find((profile) => profile.id === drink.profileId) ?? profiles.find((profile) => profile.kind === drink.kind) ?? profiles[0];
}

function nonNegative(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
