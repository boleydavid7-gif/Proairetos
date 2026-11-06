/*
 * The application manifest: the one authoritative record of which apps exist in the Proairetos family and the facts the
 * rest of the code needs about each (its name, address, worker, backup prefix, notices, Today groups, checks).
 *
 * Pure data. It imports nothing, so it can sit in any first chunk, be read by Node scripts and be copied into the
 * service worker and the Edge function by `scripts/apps/build.mjs`. Everything that was once listed by hand in
 * many files reads from here; `src/core/apps/validate.ts` and `npm run apps:check` say what an app is still missing.
 *
 * `declares` is a statement of what an app reads and writes, for the person to read. It enforces nothing: access is
 * enforced by the services that hold the data. `search` states the privacy class and what a search may index
 * (`docs/PROVIDER_CONTRACT.md`); no provider is built yet.
 */

export type AppId =
  | 'proairetos' | 'askesis' | 'hydros' | 'soma' | 'oikonomia' | 'poreia' | 'theoria' | 'praxis' | 'diaita' | 'philia'
  | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton' | 'mneme' | 'melete';

/** What an app may offer Proairetos (docs/PROVIDER_CONTRACT.md). */
export type Capability = 'library' | 'search' | 'calendar' | 'notices' | 'home';

/** private: never leaves the owning app. own-search: a minimal encrypted projection for the person's own search only. shared: explicitly authorized for other apps. */
export type PrivacyClass = 'private' | 'own-search' | 'shared';

export type AppManifest = {
  id: AppId;
  name: string;
  /** main: Proairetos. active: offered and installable. retired: kept as an identity, never offered (an alias keeps old links and records readable). */
  status: 'main' | 'active' | 'retired';
  /** A retired app whose pages now live in another (Praxis opens in Theoria's Pomodoro). */
  aliasOf?: AppId;
  line: string;
  about?: string;
  tint?: { ground: string; accent: string; ink: string };
  icon: string;
  /** main: Proairetos. family: opened by `startApp`. own: its own start-up. */
  shell: 'main' | 'own' | 'family';
  install: {
    addable: boolean;
    /** Part of the Core plan. */
    coreBundle: boolean;
    /** own: a worker in the app's folder. shared: the page uses Proairetos's worker at the root. */
    worker: 'own' | 'shared';
  };
  urls: { href: string; scope: string; entry: string };
  data: { backupPrefix?: string; syncKnown: boolean };
  notices: {
    /** The app's own reminder source on the server, when it has one. */
    source?: string;
    /** Notice kinds this source carries. */
    kinds: readonly string[];
    /** Switches under the app's name in Settings > Notifications. */
    switches: readonly { key: string; label: string }[];
    /** Place in that list, 1 first. */
    page?: number;
    /** A tap on its notice opens `/<id>/?open=…` in that app (the common case; others have their own rule in `placeFor`). */
    genericTap?: boolean;
    /** The icon an iPhone's own push shows, when it is not `/<id>/icons/icon-192.png`. */
    pushIcon?: string;
    /** Proairetos writes this source too, when it holds the app's data. */
    mainWrites: boolean;
  };
  today?: { group?: 'practice' | 'attention'; order?: number; parts: readonly string[] };
  /**
   * What universal search may hold from this app. `indexes` are the only field names a search result may carry and
   * `excludes` are fields that never appear; a field in neither is rejected. No entry means the app is not classified
   * and nothing new is indexed for it.
   */
  search?: { privacy: PrivacyClass; windowDays?: number; defaultOn?: boolean; indexes: readonly string[]; excludes: readonly string[] };
  /**
   * What the app's lines on Today may state (`shows`) and never do (`excludes`). A line is a summary and a way into the app,
   * not the record. Present for an app that provides `home`.
   */
  home?: { shows: readonly string[]; excludes: readonly string[] };
  /**
   * What the app's lines on the calendar may state (`shows`) and never do (`excludes`), and the kinds of line it has.
   * Present for an app that provides `calendar`. Lines show while the app is added.
   */
  calendar?: { shows: readonly string[]; excludes: readonly string[]; kinds: readonly ('event' | 'deadline' | 'recurring' | 'info')[]; parts?: Partial<Record<'event' | 'deadline' | 'recurring' | 'info', string>> };
  /** The capabilities this app has a provider for. The validator ties it to the registered providers. */
  provides?: readonly Capability[];
  declares?: { reads: readonly string[]; writes: readonly string[] };
  /** What the Store shows: what the app adds to Proairetos, how it connects, how many screenshots it has. */
  details?: { adds: string; connects: readonly { app: AppId; text: string }[]; shots: number };
  /** Which of the project's checks and public lists include the app. */
  surfaces: { /** An open window of this app is not counted as Proairetos when a notice is tapped. */ noticeWindow: boolean; waitlist: boolean; prefetch: boolean; speed: boolean; layout: boolean; visual: boolean; smoke: boolean; alone: boolean };
};

export const APPS: readonly AppManifest[] = [
  {
    id: 'proairetos',
    name: 'Proairetos',
    status: 'main',
    line: 'A calm planner for your days',
    icon: '/icons/icon.svg',
    shell: 'main',
    install: { addable: false, coreBundle: false, worker: 'own' },
    urls: { href: '/', scope: '/', entry: 'index.html' },
    data: { backupPrefix: 'proairetos.', syncKnown: false },
    notices: { source: 'proairetos', kinds: [], switches: [], mainWrites: false },
    search: { privacy: 'own-search', indexes: ['item title', 'notes', 'next step', 'where', 'list', 'up to you', 'not up to you', 'if something gets in the way', 'reflection text', 'decision question', 'chose', 'options', 'why', 'compass statements', 'values and meanings', 'pursuits'], excludes: ['photos and files'] },
    surfaces: { noticeWindow: false, waitlist: true, prefetch: false, speed: true, layout: true, visual: true, smoke: true, alone: false },
  },
  {
    id: 'askesis',
    name: 'Askesis',
    status: 'active',
    line: 'A running plan for any level',
    about: 'A running plan based on how much you can run now. Choose a goal like a 5K or a marathon, or just keep running regularly, and Askesis plans the weeks.',
    tint: { ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9' },
    icon: '/askesis/icon.svg',
    shell: 'own',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/askesis/', scope: '/askesis/', entry: 'askesis/index.html' },
    data: { backupPrefix: 'askesis:', syncKnown: true },
    notices: { source: 'askesis', kinds: ['run'], switches: [{ key: 'runs', label: 'Run days' }, { key: 'runMilestones', label: 'Milestones' }], page: 1, mainWrites: true },
    today: { group: 'practice', order: 2, parts: ['askesis'] },
    declares: { reads: ['the schedule', 'the weather place', 'health data the person brought in'], writes: ['a Compass goal and protected time, when asked', 'a line in Reflect, when asked'] },
    details: {
      adds: 'Today shows the session planned for the day, and your runs appear in Done today and in Reflect. You can get a reminder on run days.',
      connects: [{ app: 'dynamis', text: 'Runs and strength sessions are scheduled around each other and around your workdays.' }, { app: 'diaita', text: 'Runs are kept out of your planned sleep time.' }, { app: 'hydros', text: 'On run days, Hydros can add to your daily water amount.' }],
      shots: 2,
    },
    search: { privacy: 'own-search', indexes: ['workout title', 'workout notes', 'went well', 'next time', 'intention'], excludes: ['heart rate', 'health data brought in', 'distance by GPS'] },
    provides: ['search', 'home'],
    home: { shows: ['today\u2019s session title and length', 'the run done today, with its distance and time', 'whether a plan exists'], excludes: ['heart rate', 'notes', 'the log', 'health data brought in', 'distance by GPS'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'hydros',
    name: 'Hydros',
    status: 'active',
    line: 'Water and drink tracking',
    about: 'Log water and other drinks with one tap for your usual glasses. It also tracks caffeine, and you can set a daily amount if you want one.',
    tint: { ground: '#101923', accent: '#3A9CA0', ink: '#E9F2F5' },
    icon: '/hydros/icon.svg',
    shell: 'own',
    install: { addable: true, coreBundle: false, worker: 'own' },
    urls: { href: '/hydros/', scope: '/hydros/', entry: 'hydros/index.html' },
    data: { backupPrefix: 'hydros:', syncKnown: true },
    notices: { source: 'hydros', kinds: ['hydration'], switches: [], mainWrites: true },
    today: { group: 'practice', order: 1, parts: ['water'] },
    search: { privacy: 'own-search', windowDays: 30, defaultOn: false, indexes: ['named drink types', 'day summaries'], excludes: ['individual drinks beyond the window', 'drink times', 'caffeine, sugar and electrolytes', 'daily amount'] },
    provides: ['search', 'home'],
    home: { shows: ['the amount drunk today', 'the daily amount, when one was chosen'], excludes: ['individual drinks', 'drink times', 'caffeine, sugar and electrolytes', 'drinks on other days'] },
    details: {
      adds: 'Today shows what you’ve logged for the day.',
      connects: [{ app: 'askesis', text: 'On run days, Hydros can add to your daily amount.' }, { app: 'diaita', text: 'Caffeine after your cutoff time shows next to your sleep.' }],
      shots: 2,
    },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: false, layout: false, visual: false, smoke: true, alone: false },
  },
  {
    id: 'soma',
    name: 'Soma',
    status: 'active',
    line: 'Recipes, meal plans and groceries',
    about: 'Save recipes from websites, photos and other recipe apps, plan the week’s meals, and make a grocery list sorted by aisle.',
    tint: { ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e' },
    icon: '/soma/icon.svg',
    shell: 'own',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/soma/', scope: '/soma/', entry: 'soma/index.html' },
    data: { backupPrefix: 'soma:', syncKnown: true },
    notices: { kinds: [], switches: [], mainWrites: false },
    today: { group: 'attention', order: 7, parts: ['soma'] },
    details: {
      adds: 'Today lists the meals you’ve planned for the day, and meals you cooked appear in Reflect.',
      connects: [{ app: 'diaita', text: 'The last big meal time in Diaita opens Soma.' }],
      shots: 1,
    },
    search: { privacy: 'own-search', indexes: ['recipe title', 'ingredients', 'recipe notes', 'tags'], excludes: ['grocery lists', 'nutrition'] },
    provides: ['search', 'home'],
    home: { shows: ['recipe titles planned for today'], excludes: ['ingredients', 'notes', 'nutrition', 'grocery lists', 'tags'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'oikonomia',
    name: 'Oikonomia',
    status: 'active',
    line: 'Bills, budgets and spending',
    about: 'Track your bills and subscriptions, see what’s due, and set a monthly budget. Swipe a bill to mark it paid.',
    tint: { ground: '#0d1110', accent: '#d79572', ink: '#f2eee6' },
    icon: '/oikonomia/icon.svg',
    shell: 'own',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/oikonomia/', scope: '/oikonomia/', entry: 'oikonomia/index.html' },
    data: { backupPrefix: 'oikonomia:', syncKnown: true },
    notices: { source: 'oikonomia', kinds: ['bill'], switches: [{ key: 'bills', label: 'Bills' }], page: 2, mainWrites: true },
    today: { group: 'attention', order: 3, parts: ['bills', 'bill-dates'] },
    search: { privacy: 'own-search', indexes: ['bill name', 'due date', 'paid status'], excludes: ['bill amounts', 'amounts', 'account numbers', 'balances', 'statement lines', 'notes', 'transaction details'] },
    provides: ['search', 'home'],
    home: { shows: ['bill names', 'the first due date'], excludes: ['bill amounts', 'account numbers', 'balances', 'notes', 'payment history'] },
    details: {
      adds: 'Bills due today or tomorrow show on Today, bill dates show in Days ahead, and reminders arrive as notifications.',
      connects: [{ app: 'poreia', text: 'Trip spending is added to the month’s totals, and each trip can have its own envelope.' }, { app: 'ktema', text: 'You can add the cost of an upkeep task to the month’s spending.' }],
      shots: 2,
    },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'poreia',
    name: 'Poreia',
    status: 'active',
    line: 'Trip planning and time off',
    about: 'Plan a trip from the first idea to the trip home. Keep bookings, daily plans, packing lists and costs together, and track your time off.',
    tint: { ground: '#071c24', accent: '#4cc3c7', ink: '#d9fbf6' },
    icon: '/poreia/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/poreia/', scope: '/poreia/', entry: 'poreia/index.html' },
    data: { backupPrefix: 'poreia:', syncKnown: true },
    notices: { source: 'poreia', kinds: ['trip'], switches: [{ key: 'trips', label: 'Bookings and plans' }], page: 11, genericTap: true, pushIcon: '/poreia/icon.svg', mainWrites: true },
    today: { group: 'attention', order: 6, parts: ['trips'] },
    details: {
      adds: 'Trips show on Today and plans with a time show in Days ahead. Approved time off clears those days from your schedule.',
      connects: [{ app: 'oikonomia', text: 'Trip spending is added to the month’s totals.' }, { app: 'phyton', text: 'Plant reminders pause while you’re away.' }, { app: 'therapeia', text: 'The medicines you need can be added to the packing list.' }, { app: 'diaita', text: 'Suggests how to adjust your sleep for a new time zone.' }],
      shots: 2,
    },
    search: { privacy: 'own-search', indexes: ['trip name', 'place', 'trip notes', 'booking name', 'booking provider', 'booking place', 'booking notes', 'plan title', 'plan place', 'plan note'], excludes: ['confirmation codes', 'travel documents', 'spending', 'loyalty numbers'] },
    provides: ['search', 'home'],
    home: { shows: ['trip name and where it stands', 'the next thing on it', 'how many things are left to pack'], excludes: ['confirmation codes', 'travel documents', 'spending', 'loyalty numbers', 'notes'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: false },
  },
  {
    id: 'theoria',
    name: 'Theoria',
    status: 'active',
    line: 'Books, PDFs and highlights',
    about: 'Read books and PDFs on any device. Highlights, notes and bookmarks are saved with each book.',
    tint: { ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3' },
    icon: '/theoria/favicon.svg',
    shell: 'own',
    install: { addable: true, coreBundle: true, worker: 'shared' },
    urls: { href: '/theoria/', scope: '/theoria/', entry: 'theoria/index.html' },
    data: { backupPrefix: 'theoria:', syncKnown: true },
    notices: { kinds: [], switches: [{ key: 'study', label: 'End of a reading block' }], page: 3, mainWrites: false },
    today: { group: 'practice', order: 5, parts: ['highlight'] },
    details: {
      adds: 'Today shows your reading time, and you can save a note from a reading session to Reflect.',
      connects: [],
      shots: 1,
    },
    search: { privacy: 'own-search', indexes: ['book title', 'author', 'highlights', 'reading notes'], excludes: ['book text', 'book files'] },
    provides: ['search', 'home'],
    home: { shows: ['minutes read today'], excludes: ['book titles', 'highlights', 'notes', 'book text'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'praxis',
    name: 'Praxis',
    status: 'retired',
    aliasOf: 'theoria',
    line: 'Retired into Theoria’s Pomodoro; opens there',
    icon: '/praxis/favicon.svg',
    shell: 'own',
    install: { addable: false, coreBundle: false, worker: 'shared' },
    urls: { href: '/praxis/', scope: '/praxis/', entry: 'praxis/index.html' },
    data: { syncKnown: true },
    notices: { source: 'praxis', kinds: ['study'], switches: [], mainWrites: false },
    today: { parts: ['praxis'] },
    search: { privacy: 'private', indexes: [], excludes: ['study blocks', 'cards'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: false, layout: false, visual: false, smoke: true, alone: false },
  },
  {
    id: 'diaita',
    name: 'Diaita',
    status: 'active',
    line: 'Sleep planning for any schedule',
    about: 'A sleep plan based on your schedule, including night shifts. It shows when to go to sleep, when to wake up and when to stop caffeine, with a source for each suggestion.',
    tint: { ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1' },
    icon: '/diaita/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/diaita/', scope: '/diaita/', entry: 'diaita/index.html' },
    data: { backupPrefix: 'diaita:', syncKnown: true },
    notices: { source: 'diaita', kinds: ['rhythm'], switches: [{ key: 'rhythm', label: 'Sleep and naps' }], page: 4, genericTap: true, mainWrites: true },
    today: { group: 'practice', order: 4, parts: ['diaita'] },
    details: {
      adds: 'Today shows your sleep record, and Proairetos adjusts its lighting through the day to match your waking hours.',
      connects: [{ app: 'therapeia', text: 'Medicine reminders can follow when you wake and sleep.' }, { app: 'askesis', text: 'Runs are kept out of your sleep time.' }, { app: 'hydros', text: 'Caffeine after your cutoff time shows next to your sleep.' }, { app: 'melete', text: 'Study sessions are scheduled around your sleep.' }],
      shots: 2,
    },
    search: { privacy: 'private', indexes: [], excludes: ['sleep and naps', 'check-ins', 'worries'] },
    provides: ['home'],
    home: { shows: ['whether sleep tracking is set up', 'hours slept last night'], excludes: ['how it was', 'notes', 'signs the person recorded', 'bed and wake times'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'philia',
    name: 'Philia',
    status: 'active',
    line: 'Birthdays and staying in touch',
    about: 'Keep track of birthdays and other dates, gift ideas, and when you last spoke to the people you care about.',
    tint: { ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4' },
    icon: '/philia/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/philia/', scope: '/philia/', entry: 'philia/index.html' },
    data: { backupPrefix: 'philia:', syncKnown: true },
    notices: { source: 'philia', kinds: ['person'], switches: [{ key: 'people', label: 'Birthdays and keeping in touch' }], page: 5, genericTap: true, mainWrites: true },
    today: { group: 'attention', order: 4, parts: ['birthdays', 'birthday-dates'] },
    details: {
      adds: 'Birthdays in the next week show on Today and dates show in Days ahead. You can import people from Compass.',
      connects: [],
      shots: 2,
    },
    search: { privacy: 'own-search', indexes: ['person name', 'relation', 'remember lines', 'gift ideas', 'times together'], excludes: ['phone number', 'email address', 'birthdays and dates'] },
    provides: ['search', 'home'],
    home: { shows: ['who it is for and what it is', 'when it comes'], excludes: ['phone number', 'email address', 'notes and gift ideas', 'dates beyond the next week'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'ergon',
    name: 'Ergon',
    status: 'active',
    line: 'Shared household chores',
    about: 'Chores that repeat on the schedule you choose. Share them with the people you live with and take turns.',
    tint: { ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8' },
    icon: '/ergon/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/ergon/', scope: '/ergon/', entry: 'ergon/index.html' },
    data: { backupPrefix: 'ergon:', syncKnown: true },
    notices: { source: 'ergon', kinds: ['chore'], switches: [{ key: 'chores', label: 'Chores' }], page: 6, genericTap: true, mainWrites: true },
    today: { group: 'attention', order: 1, parts: ['chores'] },
    declares: { reads: ['the schedule (days off)', 'the household’s members'], writes: ['a to-do in Proairetos, when asked'] },
    details: {
      adds: 'Chores that are due show on Today, and any chore can be added to your to-dos. Your days off come from your schedule.',
      connects: [],
      shots: 2,
    },
    search: { privacy: 'own-search', indexes: ['chore name', 'room'], excludes: ['chore note', 'who it is assigned to', 'steps'] },
    provides: ['search', 'home'],
    home: { shows: ['chore name', 'since when', 'who has it'], excludes: ['notes', 'steps', 'history', 'the rest of the household'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'therapeia',
    name: 'Therapeia',
    status: 'active',
    line: 'Medicines and appointments',
    about: 'Medicine reminders, refill tracking and appointments, with a list of questions for your doctor. Therapeia doesn’t give medical advice.',
    tint: { ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4' },
    icon: '/therapeia/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/therapeia/', scope: '/therapeia/', entry: 'therapeia/index.html' },
    data: { backupPrefix: 'therapeia:', syncKnown: true },
    notices: { source: 'therapeia', kinds: ['dose', 'care'], switches: [{ key: 'medicines', label: 'Medicines and visits' }], page: 7, genericTap: true, mainWrites: true },
    today: { group: 'attention', order: 8, parts: ['medicines'] },
    details: {
      adds: 'Doses and visits you haven’t marked show on Today.',
      connects: [{ app: 'diaita', text: 'Doses follow when you wake and sleep, including after night shifts.' }, { app: 'poreia', text: 'Medicines for a trip can be added to its packing list.' }],
      shots: 2,
    },
    search: { privacy: 'own-search', indexes: ['medicine name', 'visit contact', 'visit place'], excludes: ['medication doses', 'medicine notes', 'visit notes', 'questions for the doctor', 'health card', 'readings'] },
    provides: ['search', 'home'],
    home: { shows: ['medicine name', 'dose time', 'refill day', 'visit contact, time and place'], excludes: ['dose amounts', 'medicine and visit notes', 'questions for the doctor', 'readings', 'the health card', 'supply counts'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'dynamis',
    name: 'Dynamis',
    status: 'active',
    line: 'Strength training and mobility',
    about: 'Strength workouts based on published research. Log your sets and weights as you go.',
    tint: { ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4' },
    icon: '/dynamis/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/dynamis/', scope: '/dynamis/', entry: 'dynamis/index.html' },
    data: { backupPrefix: 'dynamis:', syncKnown: true },
    notices: { source: 'dynamis', kinds: ['training'], switches: [{ key: 'training', label: 'Training days' }, { key: 'strengthMilestones', label: 'Milestones' }], page: 8, genericTap: true, mainWrites: true },
    today: { group: 'practice', order: 3, parts: ['training'] },
    details: {
      adds: 'Today shows the session planned for the day.',
      connects: [{ app: 'askesis', text: 'Strength sessions and runs are scheduled around each other and around your workdays.' }, { app: 'diaita', text: 'Sessions are kept out of your sleep time.' }],
      shots: 2,
    },
    search: { privacy: 'own-search', indexes: ['session title', 'session note'], excludes: ['weights and reps', 'heart rate'] },
    provides: ['search', 'home'],
    home: { shows: ['whether strength training is set up', 'today\u2019s session name or that it is done or a rest day'], excludes: ['weights and reps', 'notes', 'heart rate', 'the log'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'ktema',
    name: 'Ktema',
    status: 'active',
    line: 'Warranties, manuals and upkeep',
    about: 'Keep warranties, model and serial numbers and manuals for the things you own, and get reminders for home and car upkeep.',
    tint: { ground: '#12130f', accent: '#c7b37a', ink: '#efece2' },
    icon: '/ktema/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/ktema/', scope: '/ktema/', entry: 'ktema/index.html' },
    data: { backupPrefix: 'ktema:', syncKnown: true },
    notices: { source: 'ktema', kinds: ['upkeep'], switches: [{ key: 'upkeep', label: 'Upkeep and warranties' }], page: 9, genericTap: true, mainWrites: true },
    today: { group: 'attention', order: 2, parts: ['upkeep', 'ktema-dates'] },
    details: {
      adds: 'Upkeep that is due shows on Today. Warranty end dates and upkeep dates show on their day in Days ahead.',
      connects: [{ app: 'oikonomia', text: 'You can add the cost of an upkeep task to the month’s spending.' }],
      shots: 2,
    },
    search: { privacy: 'own-search', indexes: ['thing name', 'make and model', 'place', 'thing note', 'upkeep name', 'upkeep note'], excludes: ['serial numbers', 'prices', 'warranty details'] },
    provides: ['search', 'home'],
    home: { shows: ['upkeep name', 'the thing it is for', 'since when'], excludes: ['serial numbers', 'prices', 'warranty details', 'notes', 'photos and files'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'phyton',
    name: 'Phyton',
    status: 'active',
    line: 'Plant care and reminders',
    about: 'Reminds you when to check each plant for water, and adjusts to how often you actually water it. Look up care for about 170 plants.',
    tint: { ground: '#0f1410', accent: '#9fc48a', ink: '#ecf0e6' },
    icon: '/phyton/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/phyton/', scope: '/phyton/', entry: 'phyton/index.html' },
    data: { backupPrefix: 'phyton:', syncKnown: true },
    notices: { source: 'phyton', kinds: ['plant'], switches: [{ key: 'plants', label: 'Plants to check' }], page: 10, genericTap: true, mainWrites: true },
    today: { group: 'attention', order: 5, parts: ['plants'] },
    details: {
      adds: 'Plants that need checking show on Today.',
      connects: [{ app: 'poreia', text: 'Plant reminders pause while you’re away on a trip.' }],
      shots: 2,
    },
    search: { privacy: 'private', indexes: [], excludes: ['plant names', 'plant types', 'places', 'notes', 'photos'] },
    provides: ['home'],
    home: { shows: ['plant name', 'since when'], excludes: ['notes', 'places', 'photos', 'care history'] },
    surfaces: { noticeWindow: true, waitlist: true, prefetch: true, speed: true, layout: true, visual: true, smoke: true, alone: true },
  },
  {
    id: 'mneme',
    name: 'Mneme',
    status: 'active',
    line: 'Notes, collections and voice notes',
    about: 'Notes, collections and voice notes. Voice notes are transcribed on your device.',
    tint: { ground: '#11151b', accent: '#b7c7e2', ink: '#edf1f7' },
    icon: '/mneme/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/mneme/', scope: '/mneme/', entry: 'mneme/index.html' },
    data: { backupPrefix: 'mneme:', syncKnown: true },
    notices: { kinds: [], switches: [], mainWrites: false },
    today: { parts: ['mneme'] },
    details: {
      adds: 'Your notes and ideas appear in the Library. Notes aren’t shared with your household.',
      connects: [],
      shots: 0,
    },
    search: { privacy: 'private', indexes: [], excludes: ['note titles', 'note text', 'voice note transcripts', 'ideas'] },
    surfaces: { noticeWindow: false, waitlist: false, prefetch: false, speed: true, layout: false, visual: false, smoke: false, alone: false },
  },
  {
    id: 'melete',
    name: 'Meletē',
    status: 'active',
    line: 'Study time and subjects',
    about: 'Keep your subjects with their exam and due dates, see when you’re free this week, and schedule study time.',
    tint: { ground: '#14170f', accent: '#b8cf73', ink: '#f1f5e3' },
    icon: '/melete/icon.svg',
    shell: 'family',
    install: { addable: true, coreBundle: true, worker: 'own' },
    urls: { href: '/melete/', scope: '/melete/', entry: 'melete/index.html' },
    data: { backupPrefix: 'melete:', syncKnown: true },
    notices: { source: 'melete', kinds: ['melete'], switches: [{ key: 'melete', label: 'Study sessions and dates' }], page: 12, genericTap: true, mainWrites: true },
    today: { group: 'practice', order: 6, parts: ['study-dates'] },
    declares: { reads: ['the schedule', 'the sleep plan (Diaita)', 'other calendars', 'training days (Askesis, Dynamis)'], writes: ['a line in Reflect, when asked'] },
    details: {
      adds: 'Study sessions show on Today and in Days ahead and count as busy time. Exam and due dates show on their day in Days ahead, and Today lists the day’s study time under Daily practices.',
      connects: [{ app: 'diaita', text: 'Free time is worked out around your sleep.' }, { app: 'askesis', text: 'A run scheduled for a day shows next to it in the week.' }, { app: 'dynamis', text: 'A strength session scheduled for a day shows next to it in the week.' }],
      shots: 2,
    },
    search: { privacy: 'private', indexes: [], excludes: ['subject names', 'dates', 'materials', 'if-then lines'] },
    provides: ['home', 'calendar'],
    home: { shows: ['minutes studied today or the next session', 'the nearest date within a week, by subject name and title'], excludes: ['materials', 'if-then lines', 'hours estimates', 'the rest of the week'] },
    calendar: { shows: ['study sessions, by subject name and time', 'exam, due and other dates, by subject name and title'], excludes: ['materials', 'if-then lines', 'hour estimates', 'rhythm'], kinds: ['event', 'deadline'] },
    surfaces: { noticeWindow: true, waitlist: false, prefetch: false, speed: true, layout: false, visual: false, smoke: false, alone: false },
  },
];

export const APP_IDS: readonly AppId[] = APPS.map((app) => app.id);
export const appById = (id: string): AppManifest | undefined => APPS.find((app) => app.id === id);
