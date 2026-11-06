import { present, type Provider } from '../../core/providers';
import { watchLocal } from '../../app/family/localChanges';
import { allMedicines, circles } from '../app/state';
import { withWho, type Appointment } from '../core/medicines';

/*
 * Medicines and visits: a medicine's name, a visit's contact and place. Not doses, medicine notes, visit notes or the
 * questions for the doctor (manifest, therapeia.search). A medicine comes from the care circle's list while the person
 * is in one, as Therapeia itself does (`allMedicines`).
 */
export const therapeiaSearch: Provider<'search'> = {
  app: 'therapeia',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['local:therapeia:medicine:', 'local:therapeia:visit:', 'shared:therapeia'],
  async read(ctx) {
    const visits = (await ctx.records<Appointment>('local:therapeia:visit:')).filter((visit) => typeof visit.id === 'string');
    return [
      ...allMedicines().map((medicine) => ({
        ref: { app: 'therapeia' as const, kind: 'medicine', id: medicine.id },
        title: withWho(medicine, medicine.name),
        titleField: 'medicine name',
        fields: [],
        at: medicine.createdAt,
        label: 'Medicine in Therapeia',
        open: `/therapeia/?open=${encodeURIComponent(`medicine:${medicine.id}`)}`,
      })),
      ...visits.map((visit) => ({
        ref: { app: 'therapeia' as const, kind: 'visit', id: visit.id },
        title: withWho(visit, visit.with),
        titleField: 'visit contact',
        fields: present({ name: 'visit place', text: visit.where }),
        at: visit.createdAt,
        label: 'Visit in Therapeia',
        open: `/therapeia/?open=${encodeURIComponent(`visit:${visit.id}`)}`,
      })),
    ];
  },
  subscribe(listener) {
    const offShared = circles.subscribeShared(listener);
    const offMedicines = watchLocal('therapeia:medicine:', listener);
    const offVisits = watchLocal('therapeia:visit:', listener);
    return () => {
      offShared();
      offMedicines();
      offVisits();
    };
  },
};
