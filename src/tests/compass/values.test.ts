import { ValueChoiceError, chooseValue } from '../../core/values/rules';
import type { ChosenValue } from '../../core/values/types';
import { testContext } from '../support/testContext';

describe('choosing values', () => {
  const { context } = testContext();
  const pick = (name: string, current: ChosenValue[] = []) => chooseValue(context, 'u', name, current);

  it('recognises presets regardless of case, and keeps custom values as written', () => {
    expect(pick('  courage ')).toMatchObject({ name: 'Courage', source: 'PRESET' });
    expect(pick('Being  outdoors')).toMatchObject({ name: 'Being outdoors', source: 'CUSTOM' });
  });

  it('holds at most five values', () => {
    const five = ['Courage', 'Wisdom', 'Justice', 'Temperance', 'Family'].map((name) => pick(name));
    expect(() => pick('Health', five)).toThrow(ValueChoiceError);
  });

  it('refuses duplicates, empty names, and very long names', () => {
    expect(() => pick('wisdom', [pick('Wisdom')])).toThrow(/already/);
    expect(() => pick('   ')).toThrow(ValueChoiceError);
    expect(() => pick('x'.repeat(41))).toThrow(ValueChoiceError);
  });
});
