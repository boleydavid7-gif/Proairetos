import { changeText, changesOf, forSharing, withChanges } from './history';
import { supplyLeft, take, type Medicine } from './medicines';

const base: Medicine = {
  id: 'm', name: 'Sertraline', dose: '50 mg', times: [{ kind: 'clock', at: '08:00' }], days: { kind: 'daily' },
  start: '2026-09-01', taken: [], createdAt: '2026-09-01T08:00:00Z',
};

describe('medicine history', () => {
  it('writes what changed on each save', () => {
    const first = withChanges(undefined, base, '2026-10-15');
    expect(first.changes).toEqual([{ on: '2026-09-01', what: 'started', to: '50 mg · 8:00 AM · Every day' }].map((each) => ({ ...each, to: expect.any(String) })));
    const doubled = withChanges(first, { ...first, dose: '100 mg' }, '2026-10-15');
    expect(doubled.changes?.at(-1)).toEqual({ on: '2026-10-15', what: 'dose', from: '50 mg', to: '100 mg' });
    expect(changeText(doubled.changes!.at(-1)!)).toBe('Dose 50 mg → 100 mg');
    const stopped = withChanges(doubled, { ...doubled, stopped: '2026-10-16' }, '2026-10-15');
    expect(stopped.changes?.at(-1)).toEqual({ on: '2026-10-16', what: 'stopped' });
    expect(changesOf(stopped, { ...stopped, stopped: undefined }, '2026-10-20')).toEqual([{ on: '2026-10-20', what: 'restarted' }]);
    // Marking a dose is not a change.
    expect(withChanges(stopped, take(stopped, '2026-10-15#0', new Date()), '2026-10-15').changes).toBe(stopped.changes);
  });

  it('keeps a shared medicine short without changing what is left', () => {
    let medicine: Medicine = { ...base, supply: { count: 90, countedAt: '2026-08-01T00:00:00Z', perDose: 1, lead: 7 } };
    for (let day = 0; day < 60; day += 1) {
      const at = new Date(Date.UTC(2026, 7, 10 + day, 8));
      medicine = take(medicine, `${at.toISOString().slice(0, 10)}#0`, at);
    }
    const now = new Date('2026-10-08T12:00:00Z');
    const shared = forSharing(medicine, now);
    expect(shared.taken.length).toBeLessThanOrEqual(30);
    expect(shared.taken.length).toBeGreaterThan(0);
    expect(supplyLeft(shared)).toBe(supplyLeft(medicine));
    expect(JSON.stringify(shared).length).toBeLessThan(2800);
  });
});
