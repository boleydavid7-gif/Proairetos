import { tap } from '../../app/feel';
import { drinkFrom, volumeLabel, type Drink, type HydrosDrinkProfile, type HydrosUnit } from '../core/drinks';
import { putDrink, removeDrink } from '../data/store';
import { offerUndo } from './undo';

/** Logs a drink now (a usual glass, or the last one again), with a few seconds to take it back. */
export async function logDrink(source: { profileId: string; amountOz: number }, profiles: readonly HydrosDrinkProfile[], unit: HydrosUnit): Promise<Drink> {
  tap();
  const drink = drinkFrom(source, profiles);
  await putDrink(drink);
  offerUndo(`${drink.label} · ${volumeLabel(drink.amountOz, unit)}`, () => removeDrink(drink.id));
  return drink;
}
