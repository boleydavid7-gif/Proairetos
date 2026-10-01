export type NowSource =
  | 'scheduled'
  | 'important'
  | 'check_back'
  | 'unsorted';

export type NowItem = {
  id: string;
  title: string;
  source: NowSource;
};

export type NowView = {
  items: NowItem[];
};
