export type ItemEventModel = {
  id: string;
  itemId: string;
  kind: string;
  timestamp: string;
  valueId?: string | null;
  fromType?: string | null;
  toType?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromTime?: string | null;
  toTime?: string | null;
  metadata?: Record<string, unknown>;
};
