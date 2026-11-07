import { canTransition } from '../../core/life-items/transitions';

describe('life item transitions', () => {
  it('allows moving between open states and closing', () => {
    expect(canTransition('OPEN', 'DONE')).toBe(true);
    expect(canTransition('WAITING', 'OPEN')).toBe(true);
  });

  it('keeps invalid states blocked', () => {
    expect(canTransition('DONE', 'WAITING')).toBe(false);
    expect(canTransition('LET_GO', 'DONE')).toBe(false);
  });
});
