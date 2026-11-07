export type LifeViewFilter =
  | 'all'
  | 'open'
  | 'waiting'
  | 'done'
  | 'let_go';

export type LifeSortMode = 'created' | 'scheduled' | 'updated';

export interface LifeViewOptions {
  filter: LifeViewFilter;
  sort: LifeSortMode;
}
