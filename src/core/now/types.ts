export type NowItemReason =
  | 'SCHEDULED'
  | 'IMPORTANT'
  | 'CHECK_BACK'
  | 'UNSORTED';

export interface NowItemReference {
  itemId: string;
  reason: NowItemReason;
}
