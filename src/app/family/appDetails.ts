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
      'Starts at your own week one and builds toward a time, a distance or steady running',
      'Guides each session with bells that sound when the screen is locked',
      'Logs every run, with distance by GPS if you want it, watch files and your shoes',
      'Offers an easier version of a session, or an earlier week after time away',
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
      'Logs a drink in one tap with your usual glasses',
      'Counts every drink in full unless you change it, and shows caffeine',
      'Sets a daily amount only if you pick one, from published reference amounts',
      'Reminds you at steady times through your day, or through work blocks',
    ],
    connects: [
      { app: 'proairetos', text: 'Follows your day as Proairetos keeps it, so a night shift keeps its water.' },
      { app: 'askesis', text: 'Run days can add to the day’s amount.' },
      { app: 'diaita', text: 'Caffeine after your cutoff is set beside your sleep.' },
    ],
  },
  soma: {
    shots: 1,
    does: [
      'Saves recipes from any website, a photo, pasted text, or Paprika, Mela and Crouton files',
      'Shows a Nutri-Score and nutrients per serving, and how it got them',
      'Plans the week and builds a grocery list sorted by aisle',
      'Keeps a kitchen list with use-by dates, and a cook mode with timers',
    ],
    connects: [
      { app: 'proairetos', text: 'Meals planned for today show on Today.' },
      { app: 'diaita', text: 'Your last big meal before sleep opens Soma.' },
    ],
  },
  oikonomia: {
    shots: 2,
    does: [
      'Lists every bill and subscription with its due dates',
      'Records what you actually paid each time',
      'Keeps a monthly plan by area, and savings envelopes',
      'Reads a bank or card statement to show where the money went',
    ],
    connects: [
      { app: 'proairetos', text: 'Bills due today and tomorrow show on Today and in Days ahead. Reminders come as notices.' },
      { app: 'poreia', text: 'A trip’s spending goes into the month, and each trip can have an envelope.' },
      { app: 'ktema', text: 'The cost of upkeep can go into the month.' },
    ],
  },
  poreia: {
    shots: 2,
    does: [
      'Holds a trip’s places, bookings, days, packing and costs',
      'Shows maps, places nearby, the weather and the time difference',
      'Reads bookings from a confirmation email, a screenshot or a PDF',
      'Tracks your time off, and a travel budget for the year',
    ],
    connects: [
      { app: 'proairetos', text: 'Trips show on Today and timed plans in Days ahead. Time off clears those days from your schedule.' },
      { app: 'oikonomia', text: 'Trip spending goes into the month.' },
      { app: 'phyton', text: 'Your dates away pause plant reminders.' },
      { app: 'therapeia', text: 'The medicines you’ll need go on the packing list.' },
      { app: 'diaita', text: 'Suggests a sleep shift for the time zone.' },
    ],
  },
  theoria: {
    shots: 1,
    does: [
      'Opens your own books and PDFs on any device',
      'Keeps highlights, notes and bookmarks with the book',
      'Reads a folder in OneDrive, Google Drive or Dropbox, or one on this device',
      'Brings in highlights from a Kindle or Readwise, and has a reading timer',
    ],
    connects: [
      { app: 'proairetos', text: 'A reflection after reading can be kept in Reflect.' },
    ],
  },
  diaita: {
    shots: 2,
    does: [
      'Plans sleep, wake, wind-down and last caffeine around your real schedule',
      'Handles night shifts, rotations and days that run past midnight',
      'Lets you move sleep and wake times for a day, or for each shift in a rotation',
      'Keeps a sleep log, naps and sleep sounds, with the source for each suggestion',
    ],
    connects: [
      { app: 'proairetos', text: 'Your schedule sets the plan. The app’s light follows your waking day.' },
      { app: 'therapeia', text: 'Doses follow when you wake and sleep.' },
      { app: 'askesis', text: 'Runs stay out of your sleep.' },
      { app: 'hydros', text: 'Caffeine after the cutoff is set beside your sleep.' },
      { app: 'melete', text: 'Study time is found around your sleep.' },
    ],
  },
  philia: {
    shots: 2,
    does: [
      'Keeps birthdays, anniversaries and other dates, with reminders',
      'Holds gift ideas, things to remember and times you spent together',
      'Notes how long it has been since you were in touch, if you ask it to',
    ],
    connects: [
      { app: 'proairetos', text: 'Birthdays this week show on Today, and dates in Days ahead. You can bring people in from Compass.' },
    ],
  },
  ergon: {
    shots: 2,
    does: [
      'Brings a chore back every few days or weeks, on set days, monthly or once',
      'Shares chores with the people you live with, with turns',
      'Keeps steps inside a chore, and a reminder at a time you choose',
      'Moves a chore to your next day off, if you want that',
    ],
    connects: [
      { app: 'proairetos', text: 'Chores that have come round show on Today. Your days off come from your schedule.' },
    ],
  },
  therapeia: {
    shots: 2,
    does: [
      'Reminds you of each dose, at a set time or after you wake or before you sleep',
      'Counts down a refill from the doses you mark',
      'Keeps appointments and the questions you want to ask',
      'Tracks medicines and readings for someone you look after, and prints a list',
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
      'Builds full-body strength sessions for two to four days a week',
      'Logs sets, weights and rest as you go, and works out the plates for barbell lifts',
      'Adds short mobility routines with a guided timer',
      'Shows the history and heaviest set for each exercise',
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
      'Keeps the warranty, model and serial number, manual, price and photos for each thing',
      'Reminds you of home and car upkeep by date, or by mileage, whichever comes first',
      'Prints a list by room with prices, for insurance',
    ],
    connects: [
      { app: 'proairetos', text: 'Upkeep that has come round shows on Today.' },
      { app: 'oikonomia', text: 'The cost of upkeep can go into the month.' },
    ],
  },
  phyton: {
    shots: 2,
    does: [
      'Tells you when to check each plant, and learns from when you actually water',
      'Looks up light, watering and pet safety for about 170 plants',
      'Warns of frost and heat for plants outside',
      'Prints a sheet for whoever waters while you’re away, and shares plants with your household',
    ],
    connects: [
      { app: 'proairetos', text: 'Plants to check show on Today.' },
      { app: 'poreia', text: 'Your dates away pause plant reminders.' },
    ],
  },
  mneme: {
    shots: 0,
    does: [
      'Saves notes as you type',
      'Sorts notes into collections',
      'Records voice notes and transcribes them on your device',
    ],
    connects: [
      { app: 'proairetos', text: 'Uses the same account, backup and look. Notes aren’t shared with your household.' },
    ],
  },
  melete: {
    shots: 0,
    does: [
      'Keeps your subjects with their dates, like an exam or a due date',
      'Shows when you’re free this week, and lets you set study time there',
      'Times a sitting and rings at the end',
    ],
    connects: [
      { app: 'proairetos', text: 'Sittings show on Today and in Days ahead, and count as time taken.' },
      { app: 'diaita', text: 'Free time is found around your sleep.' },
      { app: 'askesis', text: 'A run set for a day shows beside it in the week.' },
      { app: 'dynamis', text: 'A lift set for a day shows beside it in the week.' },
    ],
  },
};
