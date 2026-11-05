import type { FamilyApp } from './FamilyApps';

/**
 * What the Store shows when an app is opened: what it does and how it connects to Proairetos and the other apps.
 * `adds` says what the app puts into Proairetos. Each line says what the feature does, in a full sentence. `connects` names another app only where that app is
 * added (the Store marks which are). Screenshots are the app's own. Check a claim against the app before writing it.
 */
export type AppDetail = {
  /** What the app adds to Proairetos itself (Today, Days ahead, Reflect, the Library, reminders). */
  adds: string;
  does: readonly string[];
  connects: readonly { app: FamilyApp; text: string }[];
  shots: number;
};

export const appDetails: Partial<Record<FamilyApp, AppDetail>> = {
  askesis: {
    adds: 'Today shows the session planned for the day, and your runs appear in Done today and in Reflect. You can get a reminder on run days.',
    shots: 2,
    does: [
      'Answer a few questions about how much you walk and run now, and get a plan that matches.',
      'Follow each session with timed bells that keep sounding when the screen is locked.',
      'Log your runs and look back at your history.',
      'Export your runs as a CSV file, or import GPX and TCX files from a watch.',
      'Track the mileage on each pair of running shoes.',
      'Switch to an easier session when you need one, or go back a week after a break.',
    ],
    connects: [
      { app: 'dynamis', text: 'Runs and strength sessions are scheduled around each other and around your workdays.' },
      { app: 'diaita', text: 'Runs are kept out of your planned sleep time.' },
      { app: 'hydros', text: 'On run days, Hydros can add to your daily water amount.' },
    ],
  },
  hydros: {
    adds: 'Today shows what you’ve logged for the day.',
    shots: 2,
    does: [
      'Log a drink in one tap with your usual glasses.',
      'Choose how much each type of drink counts toward your total.',
      'See how much caffeine you’ve had.',
      'Set a daily amount, or start from a published reference amount.',
      'Get reminders at regular times through the day, or only during work.',
    ],
    connects: [
      { app: 'askesis', text: 'On run days, Hydros can add to your daily amount.' },
      { app: 'diaita', text: 'Caffeine after your cutoff time shows next to your sleep.' },
    ],
  },
  soma: {
    adds: 'Today lists the meals you’ve planned for the day, and meals you cooked appear in Reflect.',
    shots: 1,
    does: [
      'Import recipes from a website, a photo, pasted text, or Paprika, Mela and Crouton files.',
      'See a Nutri-Score and nutrition for each serving, and how it was worked out.',
      'Plan the week’s meals and make a grocery list sorted by aisle.',
      'Keep a list of what’s in your kitchen with use-by dates.',
      'Cook from a recipe with built-in timers.',
    ],
    connects: [
      { app: 'diaita', text: 'The last big meal time in Diaita opens Soma.' },
    ],
  },
  oikonomia: {
    adds: 'Bills due today or tomorrow show on Today, bill dates show in Days ahead, and reminders arrive as notifications.',
    shots: 2,
    does: [
      'List every bill and subscription with its due dates.',
      'Record what you paid each time, including when the amount changes.',
      'Set a monthly budget by category.',
      'Save toward a goal with savings envelopes.',
      'Import a bank or card statement to see where the money went.',
    ],
    connects: [
      { app: 'poreia', text: 'Trip spending is added to the month’s totals, and each trip can have its own envelope.' },
      { app: 'ktema', text: 'You can add the cost of an upkeep task to the month’s spending.' },
    ],
  },
  poreia: {
    adds: 'Trips show on Today and plans with a time show in Days ahead. Approved time off clears those days from your schedule.',
    shots: 2,
    does: [
      'Add bookings, daily plans, a packing list and costs to each trip.',
      'View maps, nearby places, the weather and the time difference.',
      'Add a booking from a confirmation email, a screenshot or a PDF.',
      'Track your time off balance.',
      'Set a travel budget for the year.',
    ],
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
    does: [
      'Open books and PDFs on any device.',
      'Highlight text, add notes and bookmark pages.',
      'Read from a folder in OneDrive, Google Drive or Dropbox, or from a folder on this device.',
      'Import highlights from a Kindle or Readwise.',
      'Time your reading sessions.',
    ],
    connects: [
    ],
  },
  diaita: {
    adds: 'Today shows your sleep record, and Proairetos adjusts its lighting through the day to match your waking hours.',
    shots: 2,
    does: [
      'See planned sleep and wake times for each day, worked out from your schedule.',
      'Plan around night shifts, rotating schedules and days that run past midnight.',
      'Change sleep and wake times for one day, or for each shift in a rotation.',
      'Get a reminder to wind down before bed.',
      'Keep a sleep log, time naps and play sleep sounds.',
    ],
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
    does: [
      'Save birthdays, anniversaries and other dates, with reminders.',
      'Keep gift ideas for each person and mark them as given.',
      'Write down things to remember about someone.',
      'Log calls, messages and visits, and see how long it has been since you were in touch.',
    ],
    connects: [
    ],
  },
  ergon: {
    adds: 'Chores that are due show on Today. Your days off come from your schedule.',
    shots: 2,
    does: [
      'Repeat a chore every few days or weeks, on set weekdays, monthly or once.',
      'Share chores with your household and take turns.',
      'Add steps to a chore and set a reminder time.',
      'Move a chore to your next day off.',
    ],
    connects: [
    ],
  },
  therapeia: {
    adds: 'Doses and visits you haven’t marked show on Today.',
    shots: 2,
    does: [
      'Get a reminder for each dose at a set time, or after you wake or before you sleep.',
      'Mark doses as taken or skipped, and see when you’ll need a refill.',
      'Save appointments and the questions you want to ask.',
      'Track medicines and readings for someone you care for.',
      'Print your medicine list.',
    ],
    connects: [
      { app: 'diaita', text: 'Doses follow when you wake and sleep, including after night shifts.' },
      { app: 'poreia', text: 'Medicines for a trip can be added to its packing list.' },
    ],
  },
  dynamis: {
    adds: 'Today shows the session planned for the day.',
    shots: 2,
    does: [
      'Get a full-body or upper and lower body plan for two to four days a week.',
      'Log sets, weights and rest times during the workout.',
      'See which plates to load for barbell lifts.',
      'Do a short mobility routine with a guided timer.',
      'View the history and heaviest set for each exercise.',
    ],
    connects: [
      { app: 'askesis', text: 'Strength sessions and runs are scheduled around each other and around your workdays.' },
      { app: 'diaita', text: 'Sessions are kept out of your sleep time.' },
    ],
  },
  ktema: {
    adds: 'Upkeep that is due shows on Today.',
    shots: 2,
    does: [
      'Save each item’s warranty, model and serial number, manual, price and photos.',
      'Set upkeep reminders by date, or by mileage for a car.',
      'Print a list of your belongings by room with prices, for insurance.',
    ],
    connects: [
      { app: 'oikonomia', text: 'You can add the cost of an upkeep task to the month’s spending.' },
    ],
  },
  phyton: {
    adds: 'Plants that need checking show on Today.',
    shots: 2,
    does: [
      'Get reminders to check each plant, based on its type, the season and how often you actually water.',
      'Look up light, watering and pet safety for about 170 plants.',
      'Get frost and heat warnings for plants kept outside.',
      'Print a sheet for whoever waters while you’re away.',
      'Share your plants with your household.',
    ],
    connects: [
      { app: 'poreia', text: 'Plant reminders pause while you’re away on a trip.' },
    ],
  },
  mneme: {
    adds: 'Your notes and ideas appear in the Library. Notes aren’t shared with your household.',
    shots: 0,
    does: [
      'Write notes that save as you type.',
      'Group notes into collections.',
      'Record voice notes and transcribe them on your device.',
    ],
    connects: [
    ],
  },
  melete: {
    adds: 'Study sessions show on Today and in Days ahead, and count as busy time.',
    shots: 0,
    does: [
      'Add subjects with their exam and due dates.',
      'See your free time for the week and schedule study sessions in it.',
      'Time a study session, with a bell at the end.',
    ],
    connects: [
      { app: 'diaita', text: 'Free time is worked out around your sleep.' },
      { app: 'askesis', text: 'A run scheduled for a day shows next to it in the week.' },
      { app: 'dynamis', text: 'A strength session scheduled for a day shows next to it in the week.' },
    ],
  },
};
