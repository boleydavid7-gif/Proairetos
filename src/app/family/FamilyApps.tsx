import { useAddedApps, type AddOn } from './added';
import { GLYPHS, LampIcon, Sym } from '../../lamplight/icons';
import { FEEDBACK_EMAIL } from '../siteAddress';
import { feedbackLink } from './feedback';

/** The apps of the family, the same list in every one (the one open is left out). */
export type FamilyApp = 'proairetos' | 'askesis' | 'soma' | 'oikonomia' | 'hydros' | 'poreia' | 'praxis' | 'theoria' | 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton' | 'mneme';

export const familyApps: readonly { id: FamilyApp; name: string; href: string; icon: string; line: string; about?: string; tint?: { ground: string; accent: string; ink: string } }[] = [
  { id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon.svg', line: 'A calm planner for your days' },
  { id: 'askesis', name: 'Askesis', href: '/askesis/', icon: '/askesis/icon.svg', line: 'A running plan for every level', about: 'A running plan that starts where you are and builds toward your goal: a 5K, a marathon, a time or just running regularly.', tint: { ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9' } },
  { id: 'soma', name: 'Soma', href: '/soma/', icon: '/soma/icon.svg', line: 'Recipes, meal plans and groceries', about: 'Save recipes from any website, a photo or another app. Plan the week, then shop from a list sorted by aisle.', tint: { ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e' } },
  { id: 'oikonomia', name: 'Oikonomia', href: '/oikonomia/', icon: '/oikonomia/icon.svg', line: 'Bills, budgets and spending', about: 'Every bill and subscription in one place, a simple monthly budget and a clear view of what you actually spent.', tint: { ground: '#0d1110', accent: '#d79572', ink: '#f2eee6' } },
  { id: 'poreia', name: 'Poreia', href: '/poreia/', icon: '/poreia/icon.svg', line: 'Trip planning and time off', about: 'Plan a trip from the first idea to the flight home. Bookings, day plans, maps, packing and shared costs in one place, plus your time off.', tint: { ground: '#071c24', accent: '#4cc3c7', ink: '#d9fbf6' } },
  { id: 'theoria', name: 'Theoria', href: '/theoria/', icon: '/theoria/favicon.svg', line: 'Read books and PDFs, keep your highlights', about: 'Read your own books and PDFs on any device, with your highlights and notes kept alongside them.', tint: { ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3' } },
  { id: 'diaita', name: 'Diaita', href: '/diaita/', icon: '/diaita/icon.svg', line: 'Sleep and energy, around your schedule', about: 'A daily plan for sleep, naps, light, caffeine and meals that follows your real schedule, night shifts included. Every suggestion links to its source.', tint: { ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1' } },
  { id: 'philia', name: 'Philia', href: '/philia/', icon: '/philia/icon.svg', line: 'Birthdays and staying in touch', about: 'Remember birthdays, keep gift ideas and stay in touch with the people you care about.', tint: { ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4' } },
  { id: 'ergon', name: 'Ergon', href: '/ergon/', icon: '/ergon/icon.svg', line: 'Chores, shared with your household', about: 'Chores that come back when they’re due, shared with everyone you live with, with turns when you want them.', tint: { ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8' } },
  { id: 'therapeia', name: 'Therapeia', href: '/therapeia/', icon: '/therapeia/icon.svg', line: 'Medicines and appointments', about: 'Medicine reminders at the times you set or around your sleep, plus refills, appointments and the questions you want to ask. Therapeia doesn’t give medical advice.', tint: { ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4' } },
  { id: 'dynamis', name: 'Dynamis', href: '/dynamis/', icon: '/dynamis/icon.svg', line: 'Strength training and mobility', about: 'Full-body strength workouts built on research, with sets, weights and rest times logged as you go, plus short mobility routines.', tint: { ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4' } },
  { id: 'ktema', name: 'Ktema', href: '/ktema/', icon: '/ktema/icon.svg', line: 'Home, car and belongings', about: 'Warranties, model numbers and manuals in one place, with reminders for home and car maintenance by date or mileage.', tint: { ground: '#12130f', accent: '#c7b37a', ink: '#efece2' } },
  { id: 'phyton', name: 'Phyton', href: '/phyton/', icon: '/phyton/icon.svg', line: 'Plant care and watering', about: 'Phyton reminds you to check each plant when its soil is likely dry, and learns from when you actually water. Identify a plant from a photo.', tint: { ground: '#0f1410', accent: '#9fc48a', ink: '#ecf0e6' } },
  { id: 'mneme', name: 'Mneme', href: '/mneme/', icon: '/mneme/icon.svg', line: 'Notes, collections and voice notes', about: 'Notes and collections, and voice notes transcribed on your device.', tint: { ground: '#11151b', accent: '#b7c7e2', ink: '#edf1f7' } },
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
