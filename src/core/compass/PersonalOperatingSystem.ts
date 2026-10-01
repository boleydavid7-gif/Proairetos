export type EnergyLevel = 'low' | 'steady' | 'high';

export type LifeConstraint = {
  label: string;
  impact: 'blocks' | 'limits' | 'shapes';
};

export type CompassState = {
  values: string[];
  priorities: string[];
  constraints: LifeConstraint[];
  energy: EnergyLevel;
};

export type DailyGuidance = {
  focus: string;
  reason: string;
  reflectionPrompt: string;
};

/**
 * The first layer of the Proairetos engine.
 *
 * This intentionally does not optimize for productivity alone.
 * It balances direction (values), reality (constraints), and action.
 * The goal is guidance, not task pressure.
 */
export function createDailyGuidance(state: CompassState): DailyGuidance {
  const priority = state.priorities[0] ?? state.values[0] ?? 'what matters most today';

  const energyAdjustment =
    state.energy === 'low'
      ? 'Choose the smallest meaningful step.'
      : state.energy === 'high'
        ? 'Use your available energy for meaningful progress.'
        : 'Make steady progress without forcing the day.';

  return {
    focus: priority,
    reason: energyAdjustment,
    reflectionPrompt:
      'What was within your control today, and what should you adjust tomorrow?',
  };
}
