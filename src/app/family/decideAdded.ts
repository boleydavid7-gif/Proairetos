import { addedApps } from './added';

/*
 * Imported first by each app's main.tsx, before anything else can write to browser storage: the first time on a
 * device, which apps are added is read from what was there before this visit, so opening an app is never adding it.
 */
addedApps();
