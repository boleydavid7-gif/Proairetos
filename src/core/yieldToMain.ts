/**
 * Long work in small slices, so a tap is answered between them (INP). `scheduler.yield()` where the browser has it
 * (the rest of the task keeps its place at the front of the line), else a zero timeout.
 */
type SchedulerLike = { yield?: () => Promise<void> };

export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerLike }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Call `await slice()` inside a loop; it hands the thread back once `ms` of work has passed since the last time. */
export function makeSlicer(ms = 24): () => Promise<void> {
  let last = Date.now();
  return async () => {
    if (Date.now() - last < ms) return;
    await yieldToMain();
    last = Date.now();
  };
}
