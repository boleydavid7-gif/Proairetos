import type { FamilyApp } from './FamilyApps';

/**
 * What the Store shows when an app is opened: what it does and how it connects to Proairetos and the other apps.
 * Written the way store pages for Paprika, Things and Strava are: short, concrete, one feature a line. `connects`
 * names another app only where that app is added (the Store marks which are). Screenshots are the app's own.
 */
export type AppDetail = {
  does: readonly string[];
  connects: readonly { app: FamilyApp; text: string }[];
  shots: number;
};

export const appDetails: Partial<Record<FamilyApp, AppDetail>> = {
  askesis: {
    shots: 2,
    does: [
      'Begins wherever you are, and builds toward a time, a distance or steady running.',
      'Bells tell you when to walk, run and stop, even with the screen locked.',
      'Logs every run. Add distance by GPS, bring in watch files, track your shoes.',
      'Swap in an easier session, or go back a week after time off.',
    ],
    connects: [
      { app: 'proairetos', text: 'Today’s session shows on Today. Run days can send a reminder.' },
      { app: 'dynamis', text: 'Runs and lifts are spread around each other and your work days.' },
      { app: 'diaita', text: 'Runs stay out of your sleep.' },
      { app: 'hydros', text: 'Run days can add to the day’s water.' },
    ],
  },
  hydros: {
    shots: 2,
    does: [
      'Log a drink in one tap with your usual glasses.',
      'Every drink counts in full unless you change it. Caffeine is shown on its own.',
      'Choose a daily amount, or none. Published reference amounts are there if you want one.',
      'Get reminders through your day, or only during work.',
    ],
    connects: [
      { app: 'proairetos', text: 'Your day follows your schedule, so a drink after a night shift lands on the right day.' },
      { app: 'askesis', text: 'Run days can add to the day’s amount.' },
      { app: 'diaita', text: 'Caffeine after your cutoff shows next to your sleep.' },
    ],
  },
  soma: {
    shots: 1,
    does: [
      'Save a recipe from a website, a photo, pasted text, or a Paprika, Mela or Crouton file.',
      'See a Nutri-Score and nutrients for each serving, and how they were worked out.',
      'Plan the week, then shop from a list sorted by aisle.',
      'Track what’s in your kitchen and when it needs using. Cook with timers.',
    ],
    connects: [
      { app: 'proairetos', text: 'Meals planned for today show on Today.' },
      { app: 'diaita', text: 'Your last big meal before sleep opens Soma.' },
    ],
  },
  oikonomia: {
    shots: 2,
    does: [
      'List every bill and subscription with its due dates.',
      'Record what you paid each time.',
      'Set a monthly budget by category, and save toward goals with envelopes.',
      'Bring in a bank or card statement to see where the money went.',
    ],
    connects: [
      { app: 'proairetos', text: 'Bills due today and tomorrow show on Today and in Days ahead, with reminders.' },
      { app: 'poreia', text: 'A trip’s spending goes into the month, and each trip can have an envelope.' },
      { app: 'ktema', text: 'The cost of an upkeep can go into the month.' },
    ],
  },
  poreia: {
    shots: 2,
    does: [
      'Keep a trip’s places, bookings, days, packing and costs together.',
      'See maps, places nearby, the weather and the time difference.',
      'Add a booking from a confirmation email, a screenshot or a PDF.',
      'Track your time off, and a travel budget for the year.',
    ],
    connects: [
      { app: 'proairetos', text: 'Trips show on Today, and plans with a time in Days ahead. Time off clears those days from your schedule.' },
      { app: 'oikonomia', text: 'Trip spending goes into the month.' },
      { app: 'phyton', text: 'Your dates away pause plant reminders.' },
      { app: 'therapeia', text: 'The medicines you need go on the packing list.' },
      { app: 'diaita', text: 'Suggests how to shift your sleep for a new time zone.' },
    ],
  },
  theoria: {
    shots: 1,
    does: [
      'Open your own books and PDFs on any device.',
      'Highlight, take notes and bookmark. They stay with the book.',
      'Read from a folder in OneDrive, Google Drive or Dropbox, or one on this device.',
      'Bring in highlights from a Kindle or Readwise. Time your reading.',
    ],
    connects: [
      { app: 'proairetos', text: 'A reflection after reading can be saved in Reflect.' },
    ],
  },
  diaita: {
    shots: 2,
    does: [
      'See when to sleep, wake, wind down and stop caffeine, worked out from your schedule.',
      'Works with night shifts, rotations and days that run past midnight.',
      'Move sleep and wake times for one day, or for each shift in a rotation.',
      'Log your sleep, plan naps, play sleep sounds. Every suggestion links to its source.',
    ],
    connects: [
      { app: 'proairetos', text: 'Your schedule sets the plan, and the app’s light follows your waking day.' },
      { app: 'therapeia', text: 'Doses follow when you wake and sleep.' },
      { app: 'askesis', text: 'Runs stay out of your sleep.' },
      { app: 'hydros', text: 'Caffeine after the cutoff shows next to your sleep.' },
      { app: 'melete', text: 'Study time is found around your sleep.' },
    ],
  },
  philia: {
    shots: 2,
    does: [
      'Keep birthdays, anniversaries and other dates, with reminders.',
      'Save gift ideas, things to remember and times you spent together.',
      'If you ask, see how long it has been since you were in touch.',
    ],
    connects: [
      { app: 'proairetos', text: 'Birthdays this week show on Today, and dates in Days ahead. You can bring in people from Compass.' },
    ],
  },
  ergon: {
    shots: 2,
    does: [
      'Set a chore to come back every few days or weeks, on set days, monthly or once.',
      'Share chores with the people you live with, and take turns.',
      'Break a chore into steps, and pick a time for its reminder.',
      'Move a chore to your next day off, if you want.',
    ],
    connects: [
      { app: 'proairetos', text: 'Chores that have come round show on Today. Your days off come from your schedule.' },
    ],
  },
  therapeia: {
    shots: 2,
    does: [
      'Get a reminder for each dose, at a set time, or after you wake or before you sleep.',
      'Count down to a refill from the doses you mark.',
      'Keep appointments and the questions you want to ask.',
      'Track medicines and readings for someone you look after, and print a list.',
    ],
    connects: [
      { app: 'proairetos', text: 'Doses and visits you haven’t marked show on Today.' },
      { app: 'diaita', text: 'Doses follow when you wake and sleep, night shifts included.' },
      { app: 'poreia', text: 'The doses a trip needs go on its packing list.' },
    ],
  },
  dynamis: {
    shots: 2,
    does: [
      'Get full-body strength sessions for two to four days a week.',
      'Log sets, weights and rest as you go. Barbell lifts show which plates to load.',
      'Add short mobility routines with a guided timer.',
      'See the history and heaviest set for each exercise.',
    ],
    connects: [
      { app: 'proairetos', text: 'Today’s session shows on Today.' },
      { app: 'askesis', text: 'Lifts and runs are spread around each other and your work.' },
      { app: 'diaita', text: 'Sessions stay out of your sleep.' },
    ],
  },
  ktema: {
    shots: 2,
    does: [
      'Keep each thing’s warranty, model and serial number, manual, price and photos.',
      'Get reminders for home and car upkeep by date, or by mileage, whichever comes first.',
      'Print a list by room with prices, for insurance.',
    ],
    connects: [
      { app: 'proairetos', text: 'Upkeep that has come round shows on Today.' },
      { app: 'oikonomia', text: 'The cost of an upkeep can go into the month.' },
    ],
  },
  phyton: {
    shots: 2,
    does: [
      'Find out when to check each plant. It learns from when you actually water.',
      'Look up light, watering and pet safety for about 170 plants.',
      'Get a warning for frost or heat when plants are outside.',
      'Print a sheet for whoever waters while you’re away, or share your plants with your household.',
    ],
    connects: [
      { app: 'proairetos', text: 'Plants to check show on Today.' },
      { app: 'poreia', text: 'Your dates away pause plant reminders.' },
    ],
  },
  mneme: {
    shots: 0,
    does: [
      'Notes save as you type.',
      'Sort notes into collections.',
      'Record a voice note and have it transcribed on your device.',
    ],
    connects: [
      { app: 'proairetos', text: 'Uses the same account, backup and look. Notes aren’t shared with your household.' },
    ],
  },
  melete: {
    shots: 0,
    does: [
      'Keep your subjects with their dates, like an exam or a due date.',
      'See when you’re free this week, and set study time there.',
      'Time a sitting, with a bell at the end.',
    ],
    connects: [
      { app: 'proairetos', text: 'Sittings show on Today and in Days ahead, and count as time taken.' },
      { app: 'diaita', text: 'Free time is found around your sleep.' },
      { app: 'askesis', text: 'A run set for a day shows beside it in the week.' },
      { app: 'dynamis', text: 'A lift set for a day shows beside it in the week.' },
    ],
  },
};
