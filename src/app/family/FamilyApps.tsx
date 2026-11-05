import { useAddedApps, type AddOn } from './added';
import { GLYPHS, LampIcon, Sym } from '../../lamplight/icons';
import { FEEDBACK_EMAIL } from '../siteAddress';
import { feedbackLink } from './feedback';

/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = 'proairetos' | 'askesis' | 'soma' | 'oikonomia' | 'hydros' | 'poreia' | 'praxis' | 'theoria' | 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton' | 'mneme' | 'melete';

export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string; about?: string; tint?: { ground: string; accent: string; ink: string } }[] = [
  { id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon.svg', line: 'A calm planner for your days' },
  { id: 'askesis', name: 'Askesis', href: '/askesis/', icon: '/askesis/icon.svg', line: 'A running plan for any level', about: 'A running plan based on how much you can run now. Choose a goal like a 5K or a marathon, or just keep running regularly, and Askesis plans the weeks.', tint: { ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9' } },
  { id: 'hydros', name: 'Hydros', href: '/hydros/', icon: '/hydros/icon.svg', line: 'Water and drink tracking', about: 'Log water and other drinks with one tap for your usual glasses. It also tracks caffeine, and you can set a daily amount if you want one.', tint: { ground: '#101923', accent: '#3A9CA0', ink: '#E9F2F5' } },
  { id: 'soma', name: 'Soma', href: '/soma/', icon: '/soma/icon.svg', line: 'Recipes, meal plans and groceries', about: 'Save recipes from websites, photos and other recipe apps, plan the week’s meals, and make a grocery list sorted by aisle.', tint: { ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e' } },
  { id: 'oikonomia', name: 'Oikonomia', href: '/oikonomia/', icon: '/oikonomia/icon.svg', line: 'Bills, budgets and spending', about: 'Track your bills and subscriptions, see what’s due, and set a monthly budget. Swipe a bill to mark it paid.', tint: { ground: '#0d1110', accent: '#d79572', ink: '#f2eee6' } },
  { id: 'poreia', name: 'Poreia', href: '/poreia/', icon: '/poreia/icon.svg', line: 'Trip planning and time off', about: 'Plan a trip from the first idea to the trip home. Keep bookings, daily plans, packing lists and costs together, and track your time off.', tint: { ground: '#071c24', accent: '#4cc3c7', ink: '#d9fbf6' } },
  { id: 'theoria', name: 'Theoria', href: '/theoria/', icon: '/theoria/favicon.svg', line: 'Books, PDFs and highlights', about: 'Read books and PDFs on any device. Highlights, notes and bookmarks are saved with each book.', tint: { ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3' } },
  { id: 'diaita', name: 'Diaita', href: '/diaita/', icon: '/diaita/icon.svg', line: 'Sleep planning for any schedule', about: 'A sleep plan based on your schedule, including night shifts. It shows when to go to sleep, when to wake up and when to stop caffeine, with a source for each suggestion.', tint: { ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1' } },
  { id: 'philia', name: 'Philia', href: '/philia/', icon: '/philia/icon.svg', line: 'Birthdays and staying in touch', about: 'Keep track of birthdays and other dates, gift ideas, and when you last spoke to the people you care about.', tint: { ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4' } },
  { id: 'ergon', name: 'Ergon', href: '/ergon/', icon: '/ergon/icon.svg', line: 'Shared household chores', about: 'Chores that repeat on the schedule you choose. Share them with the people you live with and take turns.', tint: { ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8' } },
  { id: 'therapeia', name: 'Therapeia', href: '/therapeia/', icon: '/therapeia/icon.svg', line: 'Medicines and appointments', about: 'Medicine reminders, refill tracking and appointments, with a list of questions for your doctor. Therapeia doesn’t give medical advice.', tint: { ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4' } },
  { id: 'dynamis', name: 'Dynamis', href: '/dynamis/', icon: '/dynamis/icon.svg', line: 'Strength training and mobility', about: 'Strength workouts based on published research. Log your sets and weights as you go.', tint: { ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4' } },
  { id: 'ktema', name: 'Ktema', href: '/ktema/', icon: '/ktema/icon.svg', line: 'Warranties, manuals and upkeep', about: 'Keep warranties, model and serial numbers and manuals for the things you own, and get reminders for home and car upkeep.', tint: { ground: '#12130f', accent: '#c7b37a', ink: '#efece2' } },
  { id: 'phyton', name: 'Phyton', href: '/phyton/', icon: '/phyton/icon.svg', line: 'Plant care and reminders', about: 'Reminds you when to check each plant for water, and adjusts to how often you actually water it. Look up care for about 170 plants.', tint: { ground: '#0f1410', accent: '#9fc48a', ink: '#ecf0e6' } },
  { id: 'mneme', name: 'Mneme', href: '/mneme/', icon: '/mneme/icon.svg', line: 'Notes, collections and voice notes', about: 'Notes, collections and voice notes. Voice notes are transcribed on your device.', tint: { ground: '#11151b', accent: '#b7c7e2', ink: '#edf1f7' } },
  { id: 'melete', name: 'Meletē', href: '/melete/', icon: '/melete/icon.svg', line: 'Study time and subjects', about: 'Keep your subjects with their exam and due dates, see when you’re free this week, and schedule study time.', tint: { ground: '#14170f', accent: '#b8cf73', ink: '#f1f5e3' } },
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
              <span>App Store</span>
              
            </span>
          </a>
        </li>
      </ul>
      <ul className="rows family-apps__feedback">
        <li>
          <a className="row" href={feedbackLink(familyApps.find((app) => app.id === current)?.name ?? 'Proairetos')}>
            <span className="row__icon" aria-hidden="true">
              <LampIcon glyph={GLYPHS.pencil} size={22} />
            </span>
            <span className="row__text">
              <span>Send feedback</span>
              <span className="row__detail">{FEEDBACK_EMAIL}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>
  );
}
