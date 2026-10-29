import { useAddedApps, type AddOn } from './added';
import { Sym } from '../../lamplight/icons';

/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = 'proairetos' | 'askesis' | 'soma' | 'oikonomia' | 'hydros' | 'poreia' | 'praxis' | 'theoria' | 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton' | 'mneme';

export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string; about?: string; tint?: { ground: string; accent: string; ink: string } }[] = [
  { id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon.svg', line: 'Your days, your values, your reflections' },
  { id: 'askesis', name: 'Askesis', href: '/askesis/', icon: '/askesis/icon.svg', line: 'A running plan that fits your life', about: 'A running plan from your first walk-run to your own aim, built around your week. Guided sessions with bells, health imports when you choose, and a log.', tint: { ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9' } },
  { id: 'soma', name: 'Soma', href: '/soma/', icon: '/soma/icon.svg', line: 'Recipes and groceries', about: 'Recipes, a grocery list sorted by aisle, a loose week of meals, a list you can share, and each recipe’s Nutri-Score from what is in it.', tint: { ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e' } },
  { id: 'oikonomia', name: 'Oikonomia', href: '/oikonomia/', icon: '/oikonomia/icon.svg', line: 'Bills and household essentials', about: 'Bills and subscriptions with their dates in view, a monthly plan by area, and what went out from your statements.', tint: { ground: '#0d1110', accent: '#d79572', ink: '#f2eee6' } },
  { id: 'poreia', name: 'Poreia', href: '/poreia/', icon: '/poreia/icon.svg', line: 'Trips and time off', about: 'Trips from the first idea to home again: days with their weather, bookings from any confirmation, a map of what is around, packing, spending shared with who is going, and time off against your work schedule.', tint: { ground: '#071c24', accent: '#4cc3c7', ink: '#d9fbf6' } },
  { id: 'theoria', name: 'Theoria', href: '/theoria/', icon: '/theoria/favicon.svg', line: 'Reading, highlights and notes', about: 'Read your books and PDFs, keep highlights and notes, and bring in your Kindle highlights.', tint: { ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3' } },
  { id: 'diaita', name: 'Diaita', href: '/diaita/', icon: '/diaita/icon.svg', line: 'Sleep, light, food and caffeine around your schedule', about: 'Sleep, naps, light, caffeine and meals planned around your schedule, each line with its source.', tint: { ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1' } },
  { id: 'philia', name: 'Philia', href: '/philia/', icon: '/philia/icon.svg', line: 'The people in your life', about: 'Birthdays, things to remember, gift ideas and times together with the people in your life.', tint: { ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4' } },
  { id: 'ergon', name: 'Ergon', href: '/ergon/', icon: '/ergon/icon.svg', line: 'Household chores, shared', about: 'Chores that come around, with turns, shared with the people you live with.', tint: { ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8' } },
  { id: 'therapeia', name: 'Therapeia', href: '/therapeia/', icon: '/therapeia/icon.svg', line: 'Medicines and appointments', about: 'Medicines at the times you set, or around your sleep on any schedule. Refills, appointments and questions for them, and a plain record of what was taken.', tint: { ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4' } },
  { id: 'dynamis', name: 'Dynamis', href: '/dynamis/', icon: '/dynamis/icon.svg', line: 'Strength and mobility', about: 'Full-body strength sessions built from the research, with sets, weights and rests logged as you go, and short mobility routines.', tint: { ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4' } },
  { id: 'ktema', name: 'Ktema', href: '/ktema/', icon: '/ktema/icon.svg', line: 'Home, car and belongings', about: 'Warranties, models and manuals in one place, and upkeep that comes around by date or by mileage.', tint: { ground: '#12130f', accent: '#c7b37a', ink: '#efece2' } },
  { id: 'phyton', name: 'Phyton', href: '/phyton/', icon: '/phyton/icon.svg', line: 'Plants and watering', about: 'Each plant comes around to be checked, from its type and what you actually did. Identify a plant from a photo.', tint: { ground: '#0f1410', accent: '#9fc48a', ink: '#ecf0e6' } },
  { id: 'mneme', name: 'Mneme', href: '/mneme/', icon: '/mneme/icon.svg', line: 'Notes, collections and capture', about: 'A calm place for notes, collections, and the ideas you want to keep.', tint: { ground: '#11151b', accent: '#b7c7e2', ink: '#edf1f7' } },
];

export default function FamilyApps({ current }: { current: FamilyApp }) {
  const added = useAddedApps();
  const shown = familyApps.filter((app) => app.id !== current && (app.id === 'proairetos' || added.includes(app.id as AddOn)));
  return (
    <section className="family-apps" aria-label="The family">
      <p className="label">The family</p>
      <ul className="rows">
        {shown.map((app) => (
            <li key={app.id}>
              <a className="row" href={app.href}>
                <span className="row__icon">
                  <img className="row__app" src={app.icon} alt="" width={26} height={26} />
                </span>
                <span className="row__text">
                  <span>{app.name}</span>
                  <span className="row__detail">{app.line}</span>
                </span>
              </a>
            </li>
          ))}
        <li>
          <a className="row" href="/?open=settings:store">
            <span className="row__icon family-apps__store" aria-hidden="true">
              <Sym name="plus" />
            </span>
            <span className="row__text">
              <span>Store</span>
              
            </span>
          </a>
        </li>
      </ul>
    </section>
  );
}
