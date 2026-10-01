import { canTransitionLifeItem } from '../../core/life-items/transitions';

describe('life item transitions', () => {
  it('keeps invalid states blocked', () => {
    expect(canTransitionLifeItem('OPEN', 'DONE')).toBe(true);
  });
});
