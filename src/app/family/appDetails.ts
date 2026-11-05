import type { FamilyApp } from './FamilyApps';

/**
 * What the Store shows under an app's description: what it adds to Proairetos (`adds`) and how it connects to other
 * apps (`connects`, named only where that app is added; the Store marks which are). Screenshots are the app's own.
 * Write full sentences and check each claim against the app first.
 */
export type AppDetail = {
  /** What the app adds to Proairetos itself (Today, Days ahead, Reflect, the Library, reminders). */
  adds: string;
  connects: readonly { app: FamilyApp; text: string }[];
  shots: number;
};

export const appDetails: Partial<Record<FamilyApp, AppDetail>> = {
  askesis: {
    adds: 'Today shows the session planned for the day, and your runs appear in Done today and in Reflect. You can get a reminder on run days.',
    shots: 2,
    connects: [
      { app: 'dynamis', text: 'Runs and strength sessions are scheduled around each other and around your workdays.' },
      { app: 'diaita', text: 'Runs are kept out of your planned sleep time.' },
      { app: 'hydros', text: 'On run days, Hydros can add to your daily water amount.' },
    ],
  },
  hydros: {
    adds: 'Today shows what you’ve logged for the day.',
    shots: 2,
    connects: [
      { app: 'askesis', text: 'On run days, Hydros can add to your daily amount.' },
      { app: 'diaita', text: 'Caffeine after your cutoff time shows next to your sleep.' },
    ],
  },
  soma: {
    adds: 'Today lists the meals you’ve planned for the day, and meals you cooked appear in Reflect.',
    shots: 1,
    connects: [
      { app: 'diaita', text: 'The last big meal time in Diaita opens Soma.' },
    ],
  },
  oikonomia: {
    adds: 'Bills due today or tomorrow show on Today, bill dates show in Days ahead, and reminders arrive as notifications.',
    shots: 2,
    connects: [
      { app: 'poreia', text: 'Trip spending is added to the month’s totals, and each trip can have its own envelope.' },
      { app: 'ktema', text: 'You can add the cost of an upkeep task to the month’s spending.' },
    ],
  },
  poreia: {
    adds: 'Trips show on Today and plans with a time show in Days ahead. Approved time off clears those days from your schedule.',
    shots: 2,
    connects: [
      { app: 'oikonomia', text: 'Trip spending is added to the month’s totals.' },
      { app: 'phyton', text: 'Plant reminders pause while you’re away.' },
      { app: 'therapeia', text: 'The medicines you need can be added to the packing list.' },
      { app: 'diaita', text: 'Suggests how to adjust your sleep for a new time zone.' },
    ],
  },
  theoria: {
    adds: 'Today shows your reading time, and you can save a note from a reading session to Reflect.',
    shots: 1,
    connects: [
    ],
  },
  diaita: {
    adds: 'Today shows your sleep record, and Proairetos adjusts its lighting through the day to match your waking hours.',
    shots: 2,
    connects: [
      { app: 'therapeia', text: 'Medicine reminders can follow when you wake and sleep.' },
      { app: 'askesis', text: 'Runs are kept out of your sleep time.' },
      { app: 'hydros', text: 'Caffeine after your cutoff time shows next to your sleep.' },
      { app: 'melete', text: 'Study sessions are scheduled around your sleep.' },
    ],
  },
  philia: {
    adds: 'Birthdays in the next week show on Today and dates show in Days ahead. You can import people from Compass.',
    shots: 2,
    connects: [
    ],
  },
  ergon: {
    adds: 'Chores that are due show on Today, and any chore can be added to your to-dos. Your days off come from your schedule.',
    shots: 2,
    connects: [
    ],
  },
  therapeia: {
    adds: 'Doses and visits you haven’t marked show on Today.',
    shots: 2,
    connects: [
      { app: 'diaita', text: 'Doses follow when you wake and sleep, including after night shifts.' },
      { app: 'poreia', text: 'Medicines for a trip can be added to its packing list.' },
    ],
  },
  dynamis: {
    adds: 'Today shows the session planned for the day.',
    shots: 2,
    connects: [
      { app: 'askesis', text: 'Strength sessions and runs are scheduled around each other and around your workdays.' },
      { app: 'diaita', text: 'Sessions are kept out of your sleep time.' },
    ],
  },
  ktema: {
    adds: 'Upkeep that is due shows on Today. Warranty end dates and upkeep dates show on their day in Days ahead.',
    shots: 2,
    connects: [
      { app: 'oikonomia', text: 'You can add the cost of an upkeep task to the month’s spending.' },
    ],
  },
  phyton: {
    adds: 'Plants that need checking show on Today.',
    shots: 2,
    connects: [
      { app: 'poreia', text: 'Plant reminders pause while you’re away on a trip.' },
    ],
  },
  mneme: {
    adds: 'Your notes and ideas appear in the Library. Notes aren’t shared with your household.',
    shots: 0,
    connects: [
    ],
  },
  melete: {
    adds: 'Study sessions show on Today and in Days ahead and count as busy time. Exam and due dates show on their day in Days ahead, and Today lists the day’s study time under Daily practices.',
    shots: 2,
    connects: [
      { app: 'diaita', text: 'Free time is worked out around your sleep.' },
      { app: 'askesis', text: 'A run scheduled for a day shows next to it in the week.' },
      { app: 'dynamis', text: 'A strength session scheduled for a day shows next to it in the week.' },
    ],
  },
};
