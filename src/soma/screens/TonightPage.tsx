import { useState } from 'react';
import type { Nav } from '../app/App';
import DishImage from '../app/DishImage';
import { energyToday, useBlocks } from '../app/proairetos';
import { useGroceries, useRecipes, useSettings, useToday } from '../app/state';
import { BackLink } from '../app/ui';
import { dayShape } from '../core/dayShape';
import { kitchenNames } from '../core/kitchen';
import { threeFrom, tonight, type EnergyChoice, type Leaning, type TimeChoice } from '../core/tonight';

function Choice<T>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (next: T) => void }) {
  return (
    <section className="field" aria-label={label}>
      <span className="label">{label}</span>
      <div className="chip-grid" role="group" aria-label={label}>
        {options.map((option) => (
          <button key={String(option.id)} type="button" className="chip" aria-pressed={value === option.id} onClick={() => onChange(value === option.id ? (undefined as T) : option.id)}>
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/** A few of the person's own recipes that fit tonight. Every question can be left. */
export default function TonightPage({ nav, time: startTime }: { nav: Nav; time?: TimeChoice }) {
  const recipes = useRecipes() ?? [];
  const groceries = useGroceries() ?? [];
  const settings = useSettings();
  const today = useToday();
  const blocks = useBlocks(today);
  const shape = settings.fitsYourDay ? dayShape(blocks, today, new Date()) : undefined;
  const fromProairetos = energyToday(today);
  const [time, setTime] = useState<TimeChoice>(startTime);
  const [energy, setEnergy] = useState<EnergyChoice>(fromProairetos);
  const [leaning, setLeaning] = useState<Leaning>();
  const kitchen = kitchenNames(groceries);
  const [useKitchen, setUseKitchen] = useState(true);
  const [round, setRound] = useState(0);

  // Anything else at hand, typed here ("eggs, spinach"), counts like the kitchen list.
  const [also, setAlso] = useState('');
  const typed = also
    .split(/[,\n]+/)
    .map((each) => each.trim())
    .filter(Boolean);
  const fits = tonight(recipes, { time, energy, leaning, kitchen: [...(useKitchen ? kitchen : []), ...typed] }, today);
  const shown = threeFrom(fits, round);

  return (
    <div className="page">
      <BackLink label="Home" onBack={nav.back} />
      <h1 className="title">What can I make tonight?</h1>
      {shape?.today && (
        <a className="muted family-link" href="/?open=day%3Atoday">
          {shape.today}
        </a>
      )}

      <Choice<TimeChoice>
        label="Time"
        value={time}
        options={[
          { id: 15, label: '15 min' },
          { id: 30, label: '30 min' },
          { id: 60, label: 'An hour' },
        ]}
        onChange={(next) => (setTime(next), setRound(0))}
      />
      <Choice<EnergyChoice>
        label="Energy"
        value={energy}
        options={[
          { id: 'low', label: 'Low' },
          { id: 'some', label: 'Some' },
          { id: 'full', label: 'Plenty' },
        ]}
        onChange={(next) => (setEnergy(next), setRound(0))}
      />
      <Choice<Leaning>
        label="In the mood for"
        value={leaning}
        options={[
          { id: 'familiar', label: 'Something familiar' },
          { id: 'new', label: 'Something new' },
        ]}
        onChange={(next) => (setLeaning(next), setRound(0))}
      />
      {kitchen.length > 0 && (
        <button type="button" className="switch-row" role="switch" aria-checked={useKitchen} onClick={() => (setUseKitchen(!useKitchen), setRound(0))}>
          <span className="switch-row__text">
            <span>What’s in the kitchen first</span>
          </span>
          <span className={`switch${useKitchen ? ' switch--on' : ''}`} aria-hidden="true" />
        </button>
      )}
      <label className="field">
        <span className="label">Anything else you have?</span>
        <input className="input" placeholder="eggs, spinach, rice" value={also} onChange={(event) => (setAlso(event.target.value), setRound(0))} />
      </label>

      {recipes.length === 0 ? (
        <p className="muted">Your recipes will show here once you keep some.</p>
      ) : shown.length === 0 ? (
        <p className="muted">None of your recipes fit all of that. Leave one out to see more.</p>
      ) : (
        <ul className="recipe-rows">
          {shown.map(({ recipe, facts }) => (
            <li key={recipe.id}>
              <button type="button" className="recipe-row" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
                <DishImage recipe={recipe} />
                <span>
                  <span className="recipe-row__title">{recipe.title}</span>
                  <span className="recipe-row__meta">{facts.join(' · ')}</span>
                </span>
                <span />
              </button>
            </li>
          ))}
        </ul>
      )}
      {fits.length > 3 && (
        <button type="button" className="button-quiet" onClick={() => setRound(round + 1)}>
          Some others
        </button>
      )}
    </div>
  );
}
