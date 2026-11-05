import type { FamilyApp } from './FamilyApps';

/**
 * What the Store shows when an app is opened, as the App Store does: what it does and how it connects to
 * Proairetos and the other apps. Plain facts from what each app does today; `connects` names another app only
 * where that app is added (the Store marks which are). Screenshots are the app's own, where it has them.
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
      'A running plan that starts at your own week one and grows toward a time, a distance or steady running',
      'A guide for each session with bells you can hear with the screen locked, and optional distance by GPS',
      'A log of every run, with a CSV of the whole log, watch files and your shoes',
      'Lighter versions of a session for a day, and an earlier week offered after time away',
    ],
    connects: [
      { app: 'proairetos', text: 'Today’s session shows on Today, runs show in Done today, and run days can send a reminder at the time you chose.' },
      { app: 'dynamis', text: 'Runs and strength sessions are placed around each other and around your work days.' },
      { app: 'diaita', text: 'Your planned sleep is kept clear when a new time is offered for a run.' },
      { app: 'hydros', text: 'A run day can add to the day’s water, and the page after a run links to logging a drink.' },
    ],
  },
  hydros: {
    shots: 2,
    does: [
      'Log water and other drinks with your usual glasses, one tap each',
      'Every drink counts in full unless you change it, with caffeine shown as a plain fact',
      'A daily amount only if you choose one, with published reference amounts and their sources',
      'Reminders at steady times through your waking day, or through work blocks',
    ],
    connects: [
      { app: 'proairetos', text: 'Your day follows the day as Proairetos keeps it, so a night shift keeps its water. Today shows the day’s drinks.' },
      { app: 'askesis', text: 'A run day can add to the day’s amount.' },
      { app: 'diaita', text: 'Caffeine after your cutoff is set beside your sleep.' },
    ],
  },
  soma: {
    shots: 1,
    does: [
      'Save recipes from any website, a photo of a card, pasted text, or Paprika, Mela and Crouton files',
      'A Nutri-Score and nutrients per serving, with how each was worked out',
      'Plan the week, then shop from a list sorted by aisle',
      'A kitchen list with use-by dates, and a cook mode with timers you can hear with the screen locked',
    ],
    connects: [
      { app: 'proairetos', text: 'Meals planned for today show on Today, and cooking can keep a line in Reflect.' },
      { app: 'diaita', text: 'The last big meal before sleep opens Soma.' },
    ],
  },
  oikonomia: {
    shots: 2,
    does: [
      'Every bill and subscription with its due dates, and what you actually paid each time',
      'A simple monthly plan by area, and savings envelopes',
      'Pay dates, with the bills due before the next one',
      'Bring in a bank or card statement to see where it went',
    ],
    connects: [
      { app: 'proairetos', text: 'Bills due today and tomorrow show on Today, bill dates show in Days ahead, and reminders arrive as notices.' },
      { app: 'poreia', text: 'A trip’s spending goes into the month, and each trip can have its own envelope.' },
      { app: 'ktema', text: 'The cost of an upkeep can go into the month’s spending.' },
    ],
  },
  poreia: {
    shots: 2,
    does: [
      'A trip from the first idea to the flight home: places, bookings, days, packing and money',
      'Maps, places nearby, the weather, and time apart from home',
      'Bookings read from a confirmation email, a screenshot or a PDF',
      'Time off with a balance, and a year’s travel budget',
    ],
    connects: [
      { app: 'proairetos', text: 'Trips show on Today, plans with a time show in Days ahead, and approved time off takes those days off your schedule.' },
      { app: 'oikonomia', text: 'Each trip can have a savings envelope, and spending goes into the month.' },
      { app: 'phyton', text: 'Your dates away pause plant reminders.' },
      { app: 'therapeia', text: 'The doses the days take go onto the packing list.' },
      { app: 'diaita', text: 'Time zones come with a sleep shift worked from your usual bedtime.' },
    ],
  },
  theoria: {
    shots: 1,
    does: [
      'Read your own books and PDFs on any device, with highlights, notes and bookmarks',
      'A library folder in OneDrive, Google Drive or Dropbox, or on your computer',
      'Bring in highlights from a Kindle or Readwise',
      'A reading timer, and cards made from your own highlights',
    ],
    connects: [
      { app: 'proairetos', text: 'A reflection after reading can keep a line in Reflect.' },
    ],
  },
  diaita: {
    shots: 2,
    does: [
      'A daily plan for sleep, wake, wind-down and last caffeine, worked out from your real schedule',
      'Night shifts, rotations and a day that carries past midnight',
      'Sleep and wake times you can adjust for every day, or for each shift of a rotation',
      'A sleep log, naps, sleep sounds and a worry time, with the source for each line',
    ],
    connects: [
      { app: 'proairetos', text: 'Your schedule sets the plan, and Proairetos’s light follows your waking day.' },
      { app: 'therapeia', text: 'Doses follow your waking and sleep.' },
      { app: 'askesis', text: 'Runs and strength sessions keep clear of your sleep.' },
      { app: 'hydros', text: 'Caffeine after the cutoff is set beside your sleep.' },
      { app: 'melete', text: 'Study time is found around your sleep.' },
    ],
  },
  philia: {
    shots: 2,
    does: [
      'Birthdays, anniversaries and other dates, with reminders on the day or before',
      'Gift ideas, things to remember and times together',
      'An optional rhythm for keeping in touch that says only how long it has been',
    ],
    connects: [
      { app: 'proairetos', text: 'Birthdays in the next week show on Today, and dates show in Days ahead. People from Compass can be brought in.' },
    ],
  },
  ergon: {
    shots: 2,
    does: [
      'Chores that come around every few days or weeks, on set days, monthly or once',
      'Share with the people you live with, with turns and who did what',
      'Steps inside a chore, rooms, and a reminder at the time you choose',
      'Chores moved to your days off when you want that',
    ],
    connects: [
      { app: 'proairetos', text: 'Chores whose day came show on Today. Your work days come from your schedule.' },
    ],
  },
  therapeia: {
    shots: 2,
    does: [
      'Medicine reminders at set times, after waking or before sleep',
      'Refills counted down by the doses you mark, appointments and the questions to ask',
      'Medicines for other people you look after, and readings such as blood pressure',
      'A printable list and a health card. It gives no medical advice',
    ],
    connects: [
      { app: 'proairetos', text: 'Doses and visits still to mark show on Today.' },
      { app: 'diaita', text: 'Doses follow your waking and sleep, night shifts included.' },
      { app: 'poreia', text: 'The doses a trip needs go onto its packing list.' },
    ],
  },
  dynamis: {
    shots: 2,
    does: [
      'Full-body strength sessions on two to four days, built on the research it cites',
      'Sets, weights and rest logged as you go, with a plate calculator for barbell lifts',
      'Short mobility routines with a guided timer',
      'A history for each exercise with your heaviest set',
    ],
    connects: [
      { app: 'proairetos', text: 'Today’s session shows on Today.' },
      { app: 'askesis', text: 'Strength days and run days are placed around each other and around your work.' },
      { app: 'diaita', text: 'Sessions keep clear of your sleep.' },
    ],
  },
  ktema: {
    shots: 2,
    does: [
      'Things with their warranties, model and serial numbers, manuals, prices and photos',
      'Upkeep for home and car by date or by distance, whichever comes first',
      'A printable list by room with prices, for insurance',
    ],
    connects: [
      { app: 'proairetos', text: 'Upkeep that has come around shows on Today.' },
      { app: 'oikonomia', text: 'The cost of an upkeep can go into the month’s spending.' },
    ],
  },
  phyton: {
    shots: 2,
    does: [
      'A reminder to check each plant when its soil is likely dry, learning from when you actually water',
      'Look up light, watering and pet safety for about 170 plant types',
      'Frost and heat notes for plants outside, and a sheet for whoever waters while you are away',
      'Share your plants with the people you live with',
    ],
    connects: [
      { app: 'proairetos', text: 'Plants to check show on Today.' },
      { app: 'poreia', text: 'Your dates away pause plant reminders and make a Back home note.' },
    ],
  },
  mneme: {
    shots: 0,
    does: [
      'Notes in collections, saved as you type',
      'Voice notes, transcribed on your device',
      'Ideas captured first and sorted later',
    ],
    connects: [
      { app: 'proairetos', text: 'The same account, backup and look. Notes are not shared with the household.' },
    ],
  },
  melete: {
    shots: 0,
    does: [
      'Subjects with their dates, such as an exam or a due date, and your own hour estimates',
      'A week that shows your open time, and sittings you set in it',
      'A timer with a bell at the end',
      'Everything comes from your own notes and materials',
    ],
    connects: [
      { app: 'proairetos', text: 'Sittings show in Today and Days ahead and count as time taken.' },
      { app: 'diaita', text: 'Open time is found around your sleep.' },
      { app: 'askesis', text: 'A run set for a day shows beside it in the week.' },
      { app: 'dynamis', text: 'A strength session set for a day shows beside it in the week.' },
    ],
  },
};
