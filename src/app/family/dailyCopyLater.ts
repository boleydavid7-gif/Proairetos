/**
 * Starts the daily copy without carrying its code in an app's first chunk: the copy itself waits for a still, idle page
 * (`whenStill`), so its module (the backup format with every app's reader) can arrive after the first paint too.
 */
export function startDailyCopies(): void {
  void import('./dailyCopy').then((module) => module.startDailyCopies());
}
