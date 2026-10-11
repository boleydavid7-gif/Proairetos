import { useAddedApps, type AddOn } from './added';

/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = 'proairetos' | 'askesis' | 'soma' | 'oikonomia' | 'hydros' | 'praxis' | 'theoria' | 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema';

export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string; about?: string; tint?: { ground: string; accent: string; ink: string } }[] = [
  { id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon.svg', line: 'Your days, your values, your reflections' },
  { id: 'askesis', name: 'Askesis', href: '/askesis/', icon: '/askesis/icon.svg', line: 'Running, from your first walk-run', about: 'A running plan from your first walk-run to your own aim, built on endurance research. Guided sessions with bells, and a log.', tint: { ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9' } },
  { id: 'soma', name: 'SOMA', href: '/soma/', icon: '/soma/icon.svg', line: 'Recipes and groceries', about: 'Recipes, a grocery list sorted by aisle, a loose week of meals and a list you can share. No calorie counting.', tint: { ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e' } },
  { id: 'oikonomia', name: 'Oikonomia', href: '/oikonomia/', icon: '/oikonomia/icon.svg', line: 'Bills and household essentials', about: 'Bills and subscriptions with their dates in view, a monthly plan by area, and what went out from your statements.', tint: { ground: '#0d1110', accent: '#d79572', ink: '#f2eee6' } },
  { id: 'hydros', name: 'HYDROS', href: '/hydros/', icon: '/hydros/icon.svg', line: 'What you drink, through the day', about: 'Log a glass in one tap. Reminders through your waking hours or your work, and what you drank by day.', tint: { ground: '#061b25', accent: '#36c9f4', ink: '#a9edff' } },
  { id: 'praxis', name: 'Praxis', href: '/praxis/', icon: '/praxis/favicon.svg', line: 'Study, a block at a time', about: 'Timed study blocks with a bell, cards to look at again, and your study time by day.', tint: { ground: '#0b201a', accent: '#c9a274', ink: '#f4e9d2' } },
  { id: 'theoria', name: 'Theoria', href: '/theoria/', icon: '/theoria/favicon.svg', line: 'Reading, highlights and notes', about: 'Read your books and PDFs, keep highlights and notes, and bring in your Kindle highlights.', tint: { ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3' } },
  { id: 'diaita', name: 'Diaita', href: '/diaita/', icon: '/diaita/icon.svg', line: 'Sleep, light, food and caffeine around your schedule', about: 'Sleep, naps, light, caffeine and meals planned around your schedule, each line with its source.', tint: { ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1' } },
  { id: 'philia', name: 'Philia', href: '/philia/', icon: '/philia/icon.svg', line: 'The people in your life', about: 'Birthdays, things to remember, gift ideas and times together with the people in your life.', tint: { ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4' } },
  { id: 'ergon', name: 'Ergon', href: '/ergon/', icon: '/ergon/icon.svg', line: 'Household chores, shared', about: 'Chores that come round, with turns, shared with the people you live with.', tint: { ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8' } },
  { id: 'therapeia', name: 'Therapeia', href: '/therapeia/', icon: '/therapeia/icon.svg', line: 'Medicines and appointments', about: 'Medicines at the times you set, or around your sleep on any schedule. Refills, appointments and questions for them, and a plain record of what was taken.', tint: { ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4' } },
  { id: 'dynamis', name: 'Dynamis', href: '/dynamis/', icon: '/dynamis/icon.svg', line: 'Strength and mobility', about: 'Full-body strength sessions built from the research, with sets, weights and rests logged as you go, and short mobility routines.', tint: { ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4' } },
  { id: 'ktema', name: 'Ktema', href: '/ktema/', icon: '/ktema/icon.svg', line: 'Home, car and belongings', about: 'Warranties, models and manuals in one place, and upkeep that comes round by date or by mileage.', tint: { ground: '#12130f', accent: '#c7b37a', ink: '#efece2' } },
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
            <span className="row__icon">
              <img className="row__app" src="/icons/icon.svg" alt="" width={26} height={26} />
            </span>
            <span className="row__text">
              <span>Store</span>
              <span className="row__detail">More apps for Proairetos</span>
            </span>
          </a>
        </li>
      </ul>
    </section>
  );
}
