export type DayItemSource = 'life_item' | 'schedule_pattern';

export type DayEntry = {
  source: DayItemSource;
  id: string;
  startsAt?: string;
  endsAt?: string;
};
