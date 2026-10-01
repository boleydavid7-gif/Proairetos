export const ItemEventKinds = {
  CREATED: 'CREATED',
  SCHEDULED: 'SCHEDULED',
  RESCHEDULED: 'RESCHEDULED',
  WAITING_STARTED: 'WAITING_STARTED',
  WAITING_ENDED: 'WAITING_ENDED',
  COMPLETED: 'COMPLETED',
  REOPENED: 'REOPENED',
  LET_GO: 'LET_GO',
  VALUE_CONNECTED: 'VALUE_CONNECTED',
  VALUE_DISCONNECTED: 'VALUE_DISCONNECTED',
  CARRIED: 'CARRIED',
  UN_CARRIED: 'UN_CARRIED',
  HONORED: 'HONORED',
  TYPE_CHANGED: 'TYPE_CHANGED',
  FOCUSED: 'FOCUSED',
  DECIDED: 'DECIDED',
} as const;

export type ItemEventKind = typeof ItemEventKinds[keyof typeof ItemEventKinds];

export interface ItemEvent {
  id: string;
  itemId: string;
  kind: ItemEventKind;
  timestamp: string;
  valueId?: string;
  fromType?: string | null;
  toType?: string | null;
  fromStatus?: string;
  toStatus?: string;
  fromTime?: string;
  toTime?: string;
  metadata?: Record<string, unknown>;
}
