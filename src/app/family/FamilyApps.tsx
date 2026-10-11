import { useAddedApps, type AddOn } from './added';

/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = 'proairetos' | 'askesis' | 'soma' | 'oikonomia' | 'hydros' | 'praxis' | 'theoria' | 'diaita' | 'philia' | 'ergon';

export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string; about?: string; shot?: string }[] = [
  { id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon.svg', line: 'Your days, your values, your reflections' },
  { id: 'askesis', name: 'Askesis', href: '/askesis/', icon: '/askesis/icon.svg', line: 'Running, from your first walk-run', about: 'A running plan from your first walk-run to your own aim, built on endurance research. Guided sessions with bells, and a log.', shot: '/askesis/screenshots/narrow-1.webp' },
  { id: 'soma', name: 'SOMA', href: '/soma/', icon: '/soma/icon.svg', line: 'Recipes and groceries', about: 'Recipes, a grocery list sorted by aisle, a loose week of meals and a list you can share. No calorie counting.', shot: '/soma/screenshots/narrow-1.webp' },
  { id: 'oikonomia', name: 'Oikonomia', href: '/oikonomia/', icon: '/oikonomia/icon.svg', line: 'Bills and household essentials', about: 'Bills and subscriptions with their dates in view, a monthly plan by area, and what went out from your statements.', shot: '/oikonomia/screenshots/narrow-1.webp' },
  { id: 'hydros', name: 'HYDROS', href: '/hydros/', icon: '/hydros/icon.svg', line: 'What you drink, through the day', about: 'Log a glass in one tap. Reminders through your waking hours or your work, and what you drank by day.', shot: '/hydros/screenshots/narrow-1.webp' },
  { id: 'praxis', name: 'Praxis', href: '/praxis/', icon: '/praxis/favicon.svg', line: 'Study, a block at a time', about: 'Timed study blocks with a bell, cards to look at again, and your study time by day.', shot: '/praxis/screenshots/narrow-1.webp' },
  { id: 'theoria', name: 'Theoria', href: '/theoria/', icon: '/theoria/favicon.svg', line: 'Reading, highlights and notes', about: 'Read your books and PDFs, keep highlights and notes, and bring in your Kindle highlights.', shot: '/theoria/screenshots/narrow-1.webp' },
  { id: 'diaita', name: 'Diaita', href: '/diaita/', icon: '/diaita/icon.svg', line: 'Sleep, light, food and caffeine around your schedule', about: 'Sleep, naps, light, caffeine and meals planned around your schedule, each line with its source.', shot: '/diaita/screenshots/narrow-1.webp' },
  { id: 'philia', name: 'Philia', href: '/philia/', icon: '/philia/icon.svg', line: 'The people in your life', about: 'Birthdays, things to remember, gift ideas and times together with the people in your life.', shot: '/philia/screenshots/narrow-1.webp' },
  { id: 'ergon', name: 'Ergon', href: '/ergon/', icon: '/ergon/icon.svg', line: 'Household chores, shared', about: 'Chores that come round, with turns, shared with the people you live with.', shot: '/ergon/screenshots/narrow-1.webp' },
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
