/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = 'proairetos' | 'askesis' | 'soma' | 'oikonomia' | 'hydros' | 'praxis' | 'theoria' | 'diaita' | 'philia' | 'ergon';

export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string }[] = [
  { id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon.svg', line: 'Your days, your values, your reflections' },
  { id: 'askesis', name: 'Askesis', href: '/askesis/', icon: '/askesis/icon.svg', line: 'Running, from your first walk-run' },
  { id: 'soma', name: 'SOMA', href: '/soma/', icon: '/soma/icon.svg', line: 'Recipes and groceries' },
  { id: 'oikonomia', name: 'Oikonomia', href: '/oikonomia/', icon: '/oikonomia/icon.svg', line: 'Bills and household essentials' },
  { id: 'hydros', name: 'HYDROS', href: '/hydros/', icon: '/hydros/icon.svg', line: 'What you drink, through the day' },
  { id: 'praxis', name: 'Praxis', href: '/praxis/', icon: '/praxis/favicon.svg', line: 'Study, a block at a time' },
  { id: 'theoria', name: 'Theoria', href: '/theoria/', icon: '/theoria/favicon.svg', line: 'Reading, highlights and notes' },
  { id: 'diaita', name: 'Diaita', href: '/diaita/', icon: '/diaita/icon.svg', line: 'Sleep, light, food and caffeine around your schedule' },
  { id: 'philia', name: 'Philia', href: '/philia/', icon: '/philia/icon.svg', line: 'The people in your life' },
  { id: 'ergon', name: 'Ergon', href: '/ergon/', icon: '/ergon/icon.svg', line: 'Household chores, shared' },
];

export default function FamilyApps({ current }: { current: FamilyApp }) {
  return (
    <section className="family-apps" aria-label="The family">
      <p className="label">The family</p>
      <ul className="rows">
        {familyApps
          .filter((app) => app.id !== current)
          .map((app) => (
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
      </ul>
    </section>
  );
}
