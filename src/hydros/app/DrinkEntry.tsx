import { useState } from 'react';
import { formatVolume, hourLabel, hydrationEquivalentOz, localDateTimeInput, unitToOunces, volumeLabel, type Drink, type HydrosDrinkProfile, type HydrosUnit } from '../core/drinks';
import { putDrink, removeDrink } from '../data/store';
import { BoltIcon, CloseIcon, CupIcon, DropIcon, LeafIcon, PencilIcon } from './icons';
import { offerUndo } from './undo';

type Draft = { profileId: string; amount: string; caffeineMg: string; electrolytesMg: string; sugarG: string; loggedAt: string };

function profileFor(drink: Drink, profiles: readonly HydrosDrinkProfile[]): HydrosDrinkProfile {
  return profiles.find((profile) => profile.id === drink.profileId) ?? profiles.find((profile) => profile.kind === drink.kind) ?? profiles[0];
}

function nonNegative(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** One logged drink: what, how much, when; tap the pencil to change it or delete it (with undo). */
export default function DrinkEntry({ drink, profiles, unit, details = true }: { drink: Drink; profiles: readonly HydrosDrinkProfile[]; unit: HydrosUnit; details?: boolean }) {
  const [draft, setDraft] = useState<Draft>();
  const profile = profileFor(drink, profiles);
  const icon = profile.kind === 'coffee' ? <CupIcon /> : profile.kind === 'tea' ? <LeafIcon /> : profile.kind === 'electrolyte' ? <BoltIcon /> : <DropIcon />;
  const label = drink.label ?? profile.label;
  const credited = hydrationEquivalentOz(drink, profiles);
  const caffeine = drink.caffeineMg ?? profile.caffeineMg;

  const edit = () =>
    setDraft({
      profileId: profile.id,
      amount: formatVolume(drink.amountOz, unit),
      caffeineMg: String(caffeine),
      electrolytesMg: String(drink.electrolytesMg ?? profile.electrolytesMg),
      sugarG: String(drink.sugarG ?? profile.sugarG),
      loggedAt: localDateTimeInput(new Date(drink.loggedAt)),
    });

  const save = async () => {
    if (!draft) return;
    const chosen = profiles.find((item) => item.id === draft.profileId) ?? profile;
    const when = new Date(draft.loggedAt);
    const amount = Number(draft.amount);
    await putDrink({
      ...drink,
      kind: chosen.kind,
      profileId: chosen.id,
      label: chosen.label,
      amountOz: Number.isFinite(amount) && amount > 0 ? unitToOunces(amount, unit) : drink.amountOz,
      caffeineMg: nonNegative(draft.caffeineMg, chosen.caffeineMg),
      electrolytesMg: nonNegative(draft.electrolytesMg, chosen.electrolytesMg),
      sugarG: nonNegative(draft.sugarG, chosen.sugarG),
      loggedAt: Number.isNaN(when.getTime()) ? drink.loggedAt : when.toISOString(),
    });
    setDraft(undefined);
  };

  const remove = async () => {
    await removeDrink(drink.id);
    setDraft(undefined);
    offerUndo(`${label} deleted`, () => putDrink(drink));
  };

  return (
    <article className="recent-entry">
      <div className="recent-entry__summary">
        <span className="recent-entry__icon">{icon}</span>
        <span className="recent-entry__words">
          <strong>{label}</strong>
          <small>{volumeLabel(drink.amountOz, unit)} · {hourLabel(drink.loggedAt)}</small>
          {details && (Math.abs(credited - drink.amountOz) > 0.05 || caffeine > 0 || drink.electrolytesMg) ? (
            <em>
              {[
                Math.abs(credited - drink.amountOz) > 0.05 ? `${volumeLabel(credited, unit)} counted` : '',
                caffeine > 0 ? `${caffeine} mg caffeine` : '',
                drink.electrolytesMg ? `${drink.electrolytesMg} mg electrolytes` : '',
              ].filter(Boolean).join(' · ')}
            </em>
          ) : null}
        </span>
        <button type="button" className="recent-entry__edit" aria-label={`Change ${label}`} onClick={() => (draft ? setDraft(undefined) : edit())}><PencilIcon size={18} /></button>
      </div>
      {draft ? (
        <div className="recent-entry__editor">
          <label><span>Type</span><select value={draft.profileId} onChange={(event) => setDraft({ ...draft, profileId: event.target.value })}>{profiles.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label><span>Amount</span><input type="number" min=".1" step={unit === 'L' ? '.1' : '1'} value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /><b>{unit}</b></label>
          <label><span>Caffeine</span><input type="number" min="0" step="1" value={draft.caffeineMg} onChange={(event) => setDraft({ ...draft, caffeineMg: event.target.value })} /><b>mg</b></label>
          <label><span>Electrolytes</span><input type="number" min="0" step="1" value={draft.electrolytesMg} onChange={(event) => setDraft({ ...draft, electrolytesMg: event.target.value })} /><b>mg</b></label>
          <label><span>Sugar</span><input type="number" min="0" step="1" value={draft.sugarG} onChange={(event) => setDraft({ ...draft, sugarG: event.target.value })} /><b>g</b></label>
          <label><span>When</span><input type="datetime-local" value={draft.loggedAt} onChange={(event) => setDraft({ ...draft, loggedAt: event.target.value })} /></label>
          <div className="recent-entry__actions">
            <button type="button" className="hydros-save" onClick={() => void save()}>Save</button>
            <button type="button" className="recent-entry__cancel" onClick={() => setDraft(undefined)}><CloseIcon size={17} /> Cancel</button>
            <button type="button" className="recent-entry__delete" onClick={() => void remove()}>Delete</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
