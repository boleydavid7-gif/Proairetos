export type ScheduleContext = {
  start: Date;
  end: Date;
};

export function createScheduleContext(start: Date, end: Date): ScheduleContext {
  return { start, end };
}
