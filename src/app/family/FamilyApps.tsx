import { useAddedApps, type AddOn } from './added';
import { GLYPHS, LampIcon, Sym } from '../../lamplight/icons';
import { FEEDBACK_EMAIL } from '../siteAddress';
import { feedbackLink } from './feedback';

/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = 'proairetos' | 'askesis' | 'soma' | 'oikonomia' | 'hydros' | 'poreia' | 'praxis' | 'theoria' | 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton' | 'mneme' | 'melete';

export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string; about?: string; tint?: { ground: string; accent: string; ink: string } }[] = [
  { id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon.svg', line: 'A calm planner for your days' },
  { id: 'askesis', name: 'Askesis', href: '/askesis/', icon: '/askesis/icon.svg', line: 'A running plan for any level', about: 'A running plan that starts where you are. Pick a goal, like a 5K or a marathon, or just keep running, and it builds the weeks.', tint: { ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9' } },
  { id: 'hydros', name: 'Hydros', href: '/hydros/', icon: '/hydros/icon.svg', line: 'Water and drink tracking', about: 'Log water and other drinks in one tap. Set your usual glasses, see your caffeine, and pick a daily amount if you want one.', tint: { ground: '#101923', accent: '#3A9CA0', ink: '#E9F2F5' } },
  { id: 'soma', name: 'Soma', href: '/soma/', icon: '/soma/icon.svg', line: 'Recipes, meal plans and groceries', about: 'Keep your recipes in one place. Save them from any website, a photo or another app, plan the week, and shop from a list sorted by aisle.', tint: { ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e' } },
  { id: 'oikonomia', name: 'Oikonomia', href: '/oikonomia/', icon: '/oikonomia/icon.svg', line: 'Bills, budgets and spending', about: 'See which bills are due, track what you paid, and keep a simple monthly budget. Swipe a bill to mark it paid.', tint: { ground: '#0d1110', accent: '#d79572', ink: '#f2eee6' } },
  { id: 'poreia', name: 'Poreia', href: '/poreia/', icon: '/poreia/icon.svg', line: 'Trip planning and time off', about: 'Plan a trip from first idea to flight home. Keep bookings, day plans, maps, packing and costs together, and track your time off.', tint: { ground: '#071c24', accent: '#4cc3c7', ink: '#d9fbf6' } },
  { id: 'theoria', name: 'Theoria', href: '/theoria/', icon: '/theoria/favicon.svg', line: 'Books, PDFs and highlights', about: 'Read your own books and PDFs on any device. Highlight, take notes, and keep them with the book.', tint: { ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3' } },
  { id: 'diaita', name: 'Diaita', href: '/diaita/', icon: '/diaita/icon.svg', line: 'Sleep that fits your schedule', about: 'A sleep plan that works around your schedule, night shifts included. It shows when to sleep, when to wake and when to stop caffeine, with the source for each.', tint: { ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1' } },
  { id: 'philia', name: 'Philia', href: '/philia/', icon: '/philia/icon.svg', line: 'Birthdays and staying in touch', about: 'Remember birthdays and dates, keep gift ideas, and see how long it has been since you were in touch.', tint: { ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4' } },
  { id: 'ergon', name: 'Ergon', href: '/ergon/', icon: '/ergon/icon.svg', line: 'Shared household chores', about: 'Chores that come back when they’re due. Share them with the people you live with and take turns.', tint: { ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8' } },
  { id: 'therapeia', name: 'Therapeia', href: '/therapeia/', icon: '/therapeia/icon.svg', line: 'Medicines and appointments', about: 'Medicine reminders, refills and appointments in one place, with a list of questions for the doctor. Therapeia doesn’t give medical advice.', tint: { ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4' } },
  { id: 'dynamis', name: 'Dynamis', href: '/dynamis/', icon: '/dynamis/icon.svg', line: 'Strength training and mobility', about: 'Strength workouts built on published research. Log sets and weights as you go, and add short mobility routines.', tint: { ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4' } },
  { id: 'ktema', name: 'Ktema', href: '/ktema/', icon: '/ktema/icon.svg', line: 'Warranties, manuals and upkeep', about: 'Keep the warranty, model number and manual for everything you own, and get reminders for home and car upkeep by date or mileage.', tint: { ground: '#12130f', accent: '#c7b37a', ink: '#efece2' } },
  { id: 'phyton', name: 'Phyton', href: '/phyton/', icon: '/phyton/icon.svg', line: 'Plant care and reminders', about: 'Tells you when to check each plant, and learns from when you actually water. Look up care for about 170 plants.', tint: { ground: '#0f1410', accent: '#9fc48a', ink: '#ecf0e6' } },
  { id: 'mneme', name: 'Mneme', href: '/mneme/', icon: '/mneme/icon.svg', line: 'Notes, collections and voice notes', about: 'Notes, collections and voice notes. Voice notes are transcribed on your device.', tint: { ground: '#11151b', accent: '#b7c7e2', ink: '#edf1f7' } },
  { id: 'melete', name: 'Meletē', href: '/melete/', icon: '/melete/icon.svg', line: 'Study that fits your week', about: 'Keep your subjects and their dates, see when you’re free this week, and set study time in the gaps.', tint: { ground: '#14170f', accent: '#b8cf73', ink: '#f1f5e3' } },
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
